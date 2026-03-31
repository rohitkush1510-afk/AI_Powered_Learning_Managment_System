const SARVAM_API_KEY = process.env.SARVAM_API_KEY || process.env.OPENAI_API_KEY || ''
const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions'
const SARVAM_MODEL = process.env.SARVAM_MODEL || 'sarvam-m'

type SarvamChatOptions = {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  maxTokens?: number
  extra?: Record<string, unknown>
}

type SarvamChatResult =
  | { ok: true; text: string | null }
  | { ok: false; status: number; body: string }

function extractChoiceText(data: unknown): string | null {
  const root = data as { choices?: { message?: { content?: unknown } }[] }
  const msg = root?.choices?.[0]?.message
  if (!msg) return null
  const c = msg.content
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    const parts: string[] = []
    for (const part of c) {
      if (typeof part === 'string') parts.push(part)
      else if (part && typeof part === 'object') {
        const p = part as { type?: string; text?: string; content?: string }
        if (typeof p.text === 'string') parts.push(p.text)
        else if (typeof p.content === 'string') parts.push(p.content)
      }
    }
    return parts.length ? parts.join('') : null
  }
  return null
}

async function sendSarvamChatRequest(options: SarvamChatOptions): Promise<SarvamChatResult> {
  if (!SARVAM_API_KEY) {
    return {
      ok: false,
      status: 0,
      body: 'SARVAM_API_KEY is not set (or OPENAI_API_KEY fallback). Add it to .env and restart the dev server.',
    }
  }

  const { messages, temperature = 0.5, maxTokens = 1000, extra = {} } = options

  try {
    const res = await fetch(SARVAM_CHAT_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        Authorization: `Bearer ${SARVAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SARVAM_MODEL,
        messages,
        temperature,
        top_p: 1,
        max_tokens: maxTokens,
        ...extra,
      }),
    })

    const bodyText = await res.text()
    if (!res.ok) {
      console.error('Sarvam chat error status:', res.status, bodyText)
      return { ok: false, status: res.status, body: bodyText.slice(0, 800) }
    }

    let data: unknown
    try {
      data = JSON.parse(bodyText)
    } catch {
      return { ok: false, status: res.status, body: 'Sarvam returned non-JSON response.' }
    }

    return { ok: true, text: extractChoiceText(data) }
  } catch (error) {
    console.error('Error calling Sarvam chat API:', error)
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : 'Network error calling Sarvam',
    }
  }
}

export interface LearningPathRecommendation {
  courseId?: string
  moduleId?: string
  lessonId?: string
  reason: string
  priority: number
}

export interface CourseInsight {
  type: string
  data: any
}

export interface ChatHistoryItem {
  isAI: boolean
  message: string
}

async function callSarvamChat(options: SarvamChatOptions): Promise<string | null> {
  const result = await sendSarvamChatRequest(options)
  if (!result.ok) return null
  return result.text
}

function sanitizeTutorResponse(raw: string): string {
  let cleaned = raw

  // Remove common hidden-reasoning wrappers if the model emits them.
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '')
  cleaned = cleaned.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')

  // Remove simple "thinking" prefix blocks when they appear at the top.
  cleaned = cleaned.replace(
    /^\s*(thinking|thought process|reasoning)\s*:\s*[\s\S]*?\n{2,}/i,
    ''
  )

  return cleaned.trim()
}

/**
 * Generate personalized learning recommendations for a student
 */
export async function generatePersonalizedRecommendations(
  userId: string,
  userProgress: any[]
): Promise<LearningPathRecommendation[]> {
  if (!SARVAM_API_KEY) {
    // Return mock recommendations if API key is not set
    return [
      {
        reason: 'Based on your progress, we recommend focusing on foundational concepts',
        priority: 1,
      },
    ]
  }

  try {
    const progressSummary = userProgress
      .map((p) => `Course: ${p.course?.title || 'N/A'}, Progress: ${p.progress}%`)
      .join('\n')

    const content = await callSarvamChat({
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI learning assistant. Analyze student progress and provide personalized learning recommendations.',
        },
        {
          role: 'user',
          content: `Student progress:\n${progressSummary}\n\nProvide 3-5 personalized learning recommendations. Format as JSON array with reason and priority (1-5). Return ONLY valid JSON.`,
        },
      ],
    })

    if (content) {
      const recommendations = JSON.parse(content)
      return recommendations
    }
  } catch (error) {
    console.error('Error generating recommendations:', error)
  }

  return []
}

/**
 * Generate quiz questions based on a single lesson (legacy helper; returns [] on failure).
 */
export async function generateQuizQuestions(
  lessonContent: string,
  lessonTitle: string,
  numQuestions: number = 10
): Promise<CourseMcqForDb[]> {
  const r = await generateLessonMcqQuizFromContent(lessonTitle, lessonContent, numQuestions)
  return r.success ? r.items : []
}

/** First top-level `[` … `]` span, respecting JSON strings (avoids breaking on `]` inside option arrays). */
function findTopLevelJsonArray(raw: string): string | null {
  const start = raw.indexOf('[')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  return null
}

function extractJsonArrayFromModelContent(raw: string): any[] | null {
  if (!raw) return null
  let t = raw.trim()
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) t = fenced[1].trim()

  try {
    const parsed = JSON.parse(t)
    if (Array.isArray(parsed)) return parsed
  } catch {
    /* try substring */
  }

  const slice = findTopLevelJsonArray(t)
  if (!slice) return null
  try {
    const parsed = JSON.parse(slice)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export type CourseMcqForDb = {
  question: string
  type: string
  options: string
  correctAnswer: string
  points: number
}

function normalizeMcqQuestionForDb(q: unknown): CourseMcqForDb | null {
  if (!q || typeof q !== 'object') return null
  const obj = q as Record<string, unknown>
  const question = typeof obj.question === 'string' ? obj.question.trim() : ''
  if (!question) return null

  let optionsRaw = obj.options
  if (typeof optionsRaw === 'string') {
    try {
      optionsRaw = JSON.parse(optionsRaw)
    } catch {
      optionsRaw = []
    }
  }
  let options = Array.isArray(optionsRaw)
    ? optionsRaw.map((o) => String(o).trim()).filter(Boolean)
    : []

  if (options.length > 4) options = options.slice(0, 4)
  while (options.length < 4) {
    options.push(`Option ${options.length + 1}`)
  }

  let correct = typeof obj.correctAnswer === 'string' ? obj.correctAnswer.trim() : String(obj.correctAnswer ?? '').trim()
  if (!options.includes(correct)) {
    const letter = correct.match(/^[ABCD]$/i)?.[0]?.toUpperCase()
    if (letter) {
      const idx = { A: 0, B: 1, C: 2, D: 3 }[letter as 'A' | 'B' | 'C' | 'D']
      if (idx !== undefined) correct = options[idx]
    }
  }
  if (!options.includes(correct)) {
    const lower = correct.toLowerCase()
    const match = options.find((o) => o.toLowerCase() === lower)
    correct = match ?? options[0]
  }

  const points = typeof obj.points === 'number' && Number.isFinite(obj.points) ? obj.points : 1

  return {
    question,
    type: 'multiple_choice',
    options: JSON.stringify(options),
    correctAnswer: correct,
    points,
  }
}

function finalizeMcqFromModelText(
  raw: string,
  numQuestions: number
): { success: true; items: CourseMcqForDb[] } | { success: false; error: string } {
  if (!raw?.trim()) {
    return {
      success: false,
      error:
        'Empty response from Sarvam. Check SARVAM_MODEL in .env matches a model your key can use, or inspect server logs.',
    }
  }

  const arr = extractJsonArrayFromModelContent(raw)
  if (!arr?.length) {
    return { success: false, error: 'Could not parse a JSON array of questions from the AI response.' }
  }

  const normalized = arr
    .map((item) => normalizeMcqQuestionForDb(item))
    .filter((x): x is CourseMcqForDb => x !== null)

  if (normalized.length < numQuestions) {
    return {
      success: false,
      error: `The model returned only ${normalized.length} valid question(s); ${numQuestions} are required.`,
    }
  }

  return { success: true, items: normalized.slice(0, numQuestions) }
}

/**
 * Generate exactly `numQuestions` MCQs from a single lesson (Sarvam). One quiz should use one lesson.
 */
export async function generateLessonMcqQuizFromContent(
  lessonTitle: string,
  lessonContent: string,
  numQuestions: number = 10
): Promise<{ success: true; items: CourseMcqForDb[] } | { success: false; error: string }> {
  const trimmed = lessonContent.trim()
  if (!trimmed) {
    return { success: false, error: 'Lesson has no content to generate questions from.' }
  }

  const maxChars = 12000
  const body =
    trimmed.length > maxChars
      ? `${trimmed.slice(0, maxChars)}\n\n[...truncated for length.]`
      : trimmed

  const sarvam = await sendSarvamChatRequest({
    temperature: 0.45,
    maxTokens: 5000,
    messages: [
      {
        role: 'system',
        content:
          'You are an educational assessment designer. Build multiple-choice questions only from the provided lesson. Do not invent facts not grounded in the text. Respond with ONLY valid JSON (no markdown fences, no commentary).',
      },
      {
        role: 'user',
        content: `Lesson title: ${lessonTitle}\n\n--- Lesson content ---\n${body}\n\nCreate exactly ${numQuestions} multiple_choice questions for THIS lesson only.\nRules:\n- Each question must have exactly 4 options as a JSON array of strings.\n- correctAnswer must exactly match one of those four option strings verbatim.\n- type must be the string "multiple_choice".\n- points: 1 for each question.\n\nReturn ONLY a JSON array of objects with keys: question, type, options, correctAnswer, points.`,
      },
    ],
  })

  if (!sarvam.ok) {
    return {
      success: false,
      error:
        sarvam.status === 0 ? sarvam.body : `Sarvam API error (${sarvam.status}). ${sarvam.body}`,
    }
  }

  return finalizeMcqFromModelText(sarvam.text ?? '', numQuestions)
}

/**
 * Generate exactly `numQuestions` MCQs from aggregated course lesson text (Sarvam).
 * @deprecated Prefer {@link generateLessonMcqQuizFromContent} per lesson; kept for any legacy callers.
 */
export async function generateCourseMcqQuizFromContent(
  courseTitle: string,
  courseDescription: string,
  aggregatedLessonContent: string,
  numQuestions: number = 10
): Promise<{ success: true; items: CourseMcqForDb[] } | { success: false; error: string }> {
  const trimmed = aggregatedLessonContent.trim()
  if (!trimmed) {
    return { success: false, error: 'No lesson content available to generate questions from.' }
  }

  const maxChars = 14000
  const body =
    trimmed.length > maxChars
      ? `${trimmed.slice(0, maxChars)}\n\n[...truncated for length; questions should reflect material above.]`
      : trimmed

  const sarvam = await sendSarvamChatRequest({
    temperature: 0.45,
    maxTokens: 5000,
    messages: [
      {
        role: 'system',
        content:
          'You are an educational assessment designer. Build multiple-choice questions only from the provided course materials. Do not invent facts not grounded in the text. Respond with ONLY valid JSON (no markdown fences, no commentary).',
      },
      {
        role: 'user',
        content: `Course title: ${courseTitle}\nCourse description: ${courseDescription}\n\n--- Lesson materials ---\n${body}\n\nCreate exactly ${numQuestions} multiple_choice questions.\nRules:\n- Each question must have exactly 4 options as a JSON array of strings.\n- correctAnswer must exactly match one of those four option strings verbatim.\n- type must be the string "multiple_choice".\n- points: 1 for each question.\n\nReturn ONLY a JSON array of objects with keys: question, type, options, correctAnswer, points.`,
      },
    ],
  })

  if (!sarvam.ok) {
    return {
      success: false,
      error:
        sarvam.status === 0
          ? sarvam.body
          : `Sarvam API error (${sarvam.status}). ${sarvam.body}`,
    }
  }

  return finalizeMcqFromModelText(sarvam.text ?? '', numQuestions)
}

/**
 * Generate course insights using AI
 */
export async function generateCourseInsights(courseData: any): Promise<CourseInsight[]> {
  if (!SARVAM_API_KEY) {
    return [
      {
        type: 'difficulty',
        data: { level: 'intermediate', confidence: 0.7 },
      },
    ]
  }

  try {
    const content = await callSarvamChat({
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `
          You are an expert AI tutor for a Learning Management System. You are given a course data and you need to provide insights about the course.

            Rules:
            - Always respond in clear structured format
            - Keep answers concise but helpful
            - If JSON is requested, return ONLY valid JSON (no text)
            - Never add explanations outside JSON

            Tone:
            - Friendly but professional
            - Encourage learning
            `
        },
        {
          role: 'user',
          content: `Course: ${courseData.title}\nDescription: ${courseData.description}\n\nProvide insights about course difficulty, engagement potential, and completion rate predictions. Return ONLY a valid JSON array.`,
        },
      ],
    })

    if (content) {
      const insights = JSON.parse(content)
      return insights
    }
  } catch (error) {
    console.error('Error generating course insights:', error)
  }

  return []
}

/**
 * AI Tutor Chat - Generate responses to student questions
 */
export async function generateAITutorResponse(
  question: string,
  context?: { courseTitle?: string; lessonTitle?: string; courseContent?: string },
  chatHistory: ChatHistoryItem[] = []
): Promise<string> {
  if (!SARVAM_API_KEY) {
    return "I'm here to help! Please provide your Sarvam API key to enable AI tutoring features."
  }

  try {
    const contextPrompt = context
      ? `Context: Course - ${context.courseTitle || 'N/A'}, Lesson - ${context.lessonTitle || 'N/A'}`
      : ''

    const historyMessages = chatHistory
      .filter((item) => typeof item?.message === 'string' && item.message.trim().length > 0)
      .slice(-12)
      .map((item) => ({
        role: item.isAI ? 'assistant' : 'user',
        content: item.message.trim(),
      })) as { role: 'user' | 'assistant'; content: string }[]

    const content = await callSarvamChat({
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful AI tutor. Answer student questions clearly and encourage learning. Use prior conversation context to personalize and stay consistent with the student history. If you do not know something, admit it. Return only the final answer for the student; never include internal reasoning, chain-of-thought, or thinking traces.',
        },
        ...historyMessages,
        {
          role: 'user',
          content: `${contextPrompt}\n\nStudent Question: ${question}`,
        },
      ],
    })

    if (!content) {
      return 'I apologize, but I could not generate a response.'
    }

    const safeResponse = sanitizeTutorResponse(content)
    return safeResponse || 'I apologize, but I could not generate a response.'
  } catch (error) {
    console.error('Error generating AI tutor response:', error)
    return 'I apologize, but I encountered an error. Please try again.'
  }
}

