const SARVAM_API_KEY = process.env.SARVAM_API_KEY || process.env.OPENAI_API_KEY || ''
const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions'

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

async function callSarvamChat(options: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  temperature?: number
  maxTokens?: number
  // Allow passing through any extra Sarvam params (wiki_grounding, etc.)
  extra?: Record<string, unknown>
}): Promise<string | null> {
  if (!SARVAM_API_KEY) {
    return null
  }

  const { messages, temperature = 0.5, maxTokens = 1000, extra = {} } = options

  try {
    const res = await fetch(SARVAM_CHAT_URL, {
      method: 'POST',
      headers: {
        // Per Sarvam docs: https://docs.sarvam.ai/api-reference-docs/authentication
        'api-subscription-key': SARVAM_API_KEY,
        // Keep Authorization as a fallback (some examples use it)
        Authorization: `Bearer ${SARVAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sarvam-m',
        messages,
        temperature,
        top_p: 1,
        max_tokens: maxTokens,
        ...extra,
      }),
    })

    if (!res.ok) {
      console.error('Sarvam chat error status:', res.status, await res.text())
      return null
    }

    const data: any = await res.json()
    const content = data?.choices?.[0]?.message?.content
    return typeof content === 'string' ? content : null
  } catch (error) {
    console.error('Error calling Sarvam chat API:', error)
    return null
  }
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
 * Generate quiz questions based on lesson content
 */
export async function generateQuizQuestions(
  lessonContent: string,
  lessonTitle: string,
  numQuestions: number = 5
): Promise<any[]> {
  if (!SARVAM_API_KEY) {
    // Return mock questions if API key is not set
    return [
      {
        question: `What is the main topic of "${lessonTitle}"?`,
        type: 'multiple_choice',
        options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
        correctAnswer: 'Option A',
        points: 1,
      },
    ]
  }

  try {
    const content = await callSarvamChat({
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'You are an educational content creator. Generate quiz questions based on lesson content.',
        },
        {
          role: 'user',
          content: `Lesson Title: ${lessonTitle}\n\nLesson Content:\n${lessonContent}\n\nGenerate ${numQuestions} quiz questions. Include multiple choice questions with 4 options each. Return ONLY a valid JSON array with fields: question, type, options (as JSON array), correctAnswer, points.`,
        },
      ],
    })

    if (content) {
      const questions = JSON.parse(content)
      return questions
    }
  } catch (error) {
    console.error('Error generating quiz questions:', error)
  }

  return []
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

