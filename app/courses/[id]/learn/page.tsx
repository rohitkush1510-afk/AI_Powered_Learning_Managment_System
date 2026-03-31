'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Play, BookOpen, ClipboardList } from 'lucide-react'

interface Question {
  id: string
  question: string
  type: string
  options: string | null
  correctAnswer: string
  order: number
}

interface Quiz {
  id: string
  title: string
  description: string | null
  aiGenerated: boolean
  userId?: string | null
  questions?: Question[]
}

interface Lesson {
  id: string
  title: string
  content: string
  videoUrl: string | null
  duration: number | null
  order: number
  quizzes?: Quiz[]
}

interface Module {
  id: string
  title: string
  description: string | null
  order: number
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  modules: Module[]
}

export default function LearnPage() {
  const params = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null)
  const [quizBanner, setQuizBanner] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchCourse()
    }
  }, [params.id])

  const fetchCourse = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/courses/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      const nextCourse = data.course as Course | null
      setCourse(nextCourse)
      setSelectedLesson((prev) => {
        if (!nextCourse?.modules?.length) return null
        if (prev?.id) {
          for (const m of nextCourse.modules) {
            const found = m.lessons.find((l) => l.id === prev.id)
            if (found) return found
          }
        }
        return nextCourse.modules[0]?.lessons?.[0] ?? null
      })
    } catch (error) {
      console.error('Error fetching course:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePersonalQuiz = async (lessonId: string) => {
    if (user?.role !== 'STUDENT') return
    setGeneratingLessonId(lessonId)
    setQuizBanner(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lessonId, numQuestions: 10 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz')
      setQuizBanner({
        variant: 'success',
        text: 'Your personal practice quiz was created. Scroll down to see it.',
      })
      await fetchCourse()
    } catch (e: unknown) {
      setQuizBanner({
        variant: 'error',
        text: e instanceof Error ? e.message : 'Failed to generate personal quiz.',
      })
    } finally {
      setGeneratingLessonId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Course not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg">{course.title}</h2>
        </div>
        <div className="p-4 space-y-4">
          {course.modules.map((module) => (
            <div key={module.id}>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">{module.title}</h3>
              <div className="space-y-1">
                {module.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedLesson?.id === lesson.id
                        ? 'bg-primary-100 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Play className="h-4 w-4" />
                      <span className="flex-1">{lesson.title}</span>
                      {lesson.duration && (
                        <span className="text-xs text-gray-500">{lesson.duration}m</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedLesson ? (
          <div className="max-w-4xl mx-auto p-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h1 className="text-3xl font-bold mb-4">{selectedLesson.title}</h1>
              {selectedLesson.videoUrl && (
                <div className="mb-6">
                  <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                    <Play className="h-16 w-16 text-white" />
                    <span className="ml-4 text-white">Video Player</span>
                  </div>
                </div>
              )}
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">{selectedLesson.content}</div>
              </div>

              {user?.role === 'STUDENT' && (
                <div className="mt-8 p-4 rounded-lg border border-primary-200 bg-primary-50/60">
                  <p className="text-sm text-gray-700 mb-3">
                    Build a <strong>personal practice quiz</strong> from this lesson (10 MCQs via Sarvam). Only you
                    can see it.
                  </p>
                  <button
                    type="button"
                    onClick={() => generatePersonalQuiz(selectedLesson.id)}
                    disabled={generatingLessonId !== null}
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                  >
                    <ClipboardList className="h-4 w-4 shrink-0" />
                    {generatingLessonId === selectedLesson.id ? 'Generating…' : 'My practice quiz (AI)'}
                  </button>
                </div>
              )}

              {quizBanner && (
                <p
                  className={`mt-4 text-sm rounded-lg px-3 py-2 border ${
                    quizBanner.variant === 'error'
                      ? 'bg-red-50 text-red-800 border-red-100'
                      : 'bg-green-50 text-green-800 border-green-100'
                  }`}
                >
                  {quizBanner.text}
                </p>
              )}

              {selectedLesson.quizzes && selectedLesson.quizzes.length > 0 && (
                <div className="mt-10 pt-8 border-t border-gray-200 space-y-8">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <ClipboardList className="h-6 w-6 text-primary-600" />
                    Quizzes for this lesson
                  </h2>
                  <p className="text-sm text-gray-500">
                    Course quizzes are from your instructor. Quizzes labeled “Yours” are private practice sets you
                    generated.
                  </p>
                  {selectedLesson.quizzes.map((quiz) => {
                    const questions = quiz.questions ?? []
                    const isPersonal = quiz.userId != null && quiz.userId === user?.id
                    return (
                    <div
                      key={quiz.id}
                      className="rounded-lg border border-gray-200 bg-gray-50/80 p-6 space-y-4"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-medium text-gray-900">{quiz.title}</h3>
                          {isPersonal && (
                            <span className="text-xs font-medium bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                              Yours only
                            </span>
                          )}
                        </div>
                        {quiz.description && (
                          <p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {questions.length} question{questions.length !== 1 ? 's' : ''}
                          {quiz.aiGenerated ? ' · AI-generated' : ''}
                        </p>
                      </div>
                      <ol className="list-decimal list-inside space-y-4 text-gray-800">
                        {[...questions]
                          .sort((a, b) => a.order - b.order)
                          .map((q) => {
                            let opts: string[] = []
                            if (q.options) {
                              try {
                                const parsed = JSON.parse(q.options)
                                if (Array.isArray(parsed)) opts = parsed.map(String)
                              } catch {
                                opts = []
                              }
                            }
                            const showKey =
                              user?.role === 'INSTRUCTOR' ||
                              user?.role === 'ADMIN' ||
                              (user?.role === 'STUDENT' && isPersonal)
                            return (
                              <li key={q.id} className="pl-1">
                                <span className="font-medium">{q.question}</span>
                                {opts.length > 0 && (
                                  <ul className="mt-2 ml-4 list-none space-y-1 text-sm text-gray-700">
                                    {opts.map((opt, i) => (
                                      <li key={i} className="flex gap-2">
                                        <span className="text-gray-400 w-5 shrink-0">
                                          {String.fromCharCode(65 + i)}.
                                        </span>
                                        <span>{opt}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {showKey && (
                                  <p className="mt-2 text-sm text-green-800 bg-green-50 border border-green-100 rounded px-2 py-1 inline-block">
                                    Correct answer: {q.correctAnswer}
                                  </p>
                                )}
                              </li>
                            )
                          })}
                      </ol>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Select a lesson to begin learning</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

