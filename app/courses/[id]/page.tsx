'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { BookOpen, Play, Clock, Plus, Sparkles } from 'lucide-react'

interface Lesson {
  id: string
  title: string
  duration: number | null
  order: number
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
  description: string
  status: string
  instructor: { id: string; name: string; email: string }
  modules: Module[]
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Instructor builder state
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newModuleDescription, setNewModuleDescription] = useState('')
  const [newLessonModuleId, setNewLessonModuleId] = useState<string>('')
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonContent, setNewLessonContent] = useState('')
  const [newLessonDuration, setNewLessonDuration] = useState<string>('')

  useEffect(() => {
    if (params.id) {
      fetchCourse()
      checkEnrollment()
    }
  }, [params.id])

  const fetchCourse = async () => {
    try {
      setError(null)
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/courses/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setCourse(data.course)
    } catch (error) {
      console.error('Error fetching course:', error)
      setError('Failed to load course.')
    } finally {
      setLoading(false)
    }
  }

  const checkEnrollment = async () => {
    if (!user || user.role !== 'STUDENT') return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/enrollments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      const isEnrolled = data.enrollments?.some(
        (e: any) => e.courseId === params.id
      )
      setEnrolled(isEnrolled)
    } catch (error) {
      console.error('Error checking enrollment:', error)
    }
  }

  const handleEnroll = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    try {
      setError(null)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId: params.id }),
      })

      if (res.ok) {
        setEnrolled(true)
        router.push(`/courses/${params.id}/learn`)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Enrollment failed.')
      }
    } catch (error) {
      console.error('Error enrolling:', error)
      setError('Enrollment failed.')
    }
  }

  const isInstructorOwner =
    !!user && (user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && course?.instructor?.id === user.id))

  const createModule = async () => {
    if (!course) return
    if (!newModuleTitle.trim()) return
    setCreating(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.id,
          title: newModuleTitle.trim(),
          description: newModuleDescription.trim() || null,
          order: course.modules.length + 1,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create module')
      setNewModuleTitle('')
      setNewModuleDescription('')
      await fetchCourse()
    } catch (e: any) {
      setError(e.message || 'Failed to create module.')
    } finally {
      setCreating(false)
    }
  }

  const createLesson = async () => {
    if (!course) return
    if (!newLessonModuleId) return
    if (!newLessonTitle.trim() || !newLessonContent.trim()) return
    setCreating(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const duration = newLessonDuration.trim() ? Number(newLessonDuration.trim()) : null
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moduleId: newLessonModuleId,
          title: newLessonTitle.trim(),
          content: newLessonContent.trim(),
          duration: Number.isFinite(duration as number) ? duration : null,
          order: 1,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create lesson')
      setNewLessonTitle('')
      setNewLessonContent('')
      setNewLessonDuration('')
      await fetchCourse()
    } catch (e: any) {
      setError(e.message || 'Failed to create lesson.')
    } finally {
      setCreating(false)
    }
  }

  const publishCourse = async () => {
    if (!course || !isInstructorOwner || course.status !== 'DRAFT') return
    setCreating(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish course')
      // PUT response does not include modules; refresh full course payload.
      await fetchCourse()
    } catch (e: any) {
      setError(e.message || 'Failed to publish course.')
    } finally {
      setCreating(false)
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-2">
                <div>
                  <span className="text-sm text-gray-500">Instructor:</span>
                  <span className="ml-2 font-medium">{course.instructor.name}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className="ml-2 font-medium">{course.status}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Modules:</span>
                  <span className="ml-2 font-medium">{course.modules.length}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              {user?.role === 'STUDENT' && (
                <button
                  onClick={handleEnroll}
                  disabled={enrolled}
                  className={`w-full px-6 py-2 rounded-lg font-semibold ${
                    enrolled
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {enrolled ? 'Enrolled' : 'Enroll Now'}
                </button>
              )}

              {enrolled && (
                <button
                  onClick={() => router.push(`/courses/${params.id}/learn`)}
                  className="w-full px-6 py-2 rounded-lg font-semibold bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
                >
                  Start Learning
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-8">
            {error}
          </div>
        )}

        {isInstructorOwner && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-semibold">Course Builder</h2>
              <div className="flex items-center gap-3">
                {course.status === 'DRAFT' && (
                  <button
                    onClick={publishCourse}
                    disabled={creating}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {creating ? 'Publishing...' : 'Publish Course'}
                  </button>
                )}
                <div className="text-sm text-gray-500 inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Build modules and lessons
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="border rounded-lg p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary-600" />
                  Add module
                </h3>
                <div className="space-y-3">
                  <input
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder="Module title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <textarea
                    value={newModuleDescription}
                    onChange={(e) => setNewModuleDescription(e.target.value)}
                    placeholder="Module description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={createModule}
                    disabled={creating || !newModuleTitle.trim()}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {creating ? 'Saving...' : 'Create module'}
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary-600" />
                  Add lesson
                </h3>
                <div className="space-y-3">
                  <select
                    value={newLessonModuleId}
                    onChange={(e) => setNewLessonModuleId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select module</option>
                    {course.modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="Lesson title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <textarea
                    value={newLessonContent}
                    onChange={(e) => setNewLessonContent(e.target.value)}
                    placeholder="Lesson content (markdown or plain text)"
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    value={newLessonDuration}
                    onChange={(e) => setNewLessonDuration(e.target.value)}
                    placeholder="Duration in minutes (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={createLesson}
                    disabled={creating || !newLessonModuleId || !newLessonTitle.trim() || !newLessonContent.trim()}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {creating ? 'Saving...' : 'Create lesson'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Course Content</h2>
          <div className="space-y-6">
            {course.modules.map((module) => (
              <div key={module.id} className="border-b pb-6 last:border-b-0">
                <h3 className="text-xl font-semibold mb-2">{module.title}</h3>
                {module.description && (
                  <p className="text-gray-600 mb-4">{module.description}</p>
                )}
                <div className="space-y-2">
                  {module.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Play className="h-5 w-5 text-primary-600" />
                        <span>{lesson.title}</span>
                      </div>
                      {lesson.duration && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{lesson.duration} min</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {module.lessons.length === 0 && (
                    <div className="text-sm text-gray-500 px-3 py-2">No lessons yet.</div>
                  )}
                </div>
              </div>
            ))}
            {course.modules.length === 0 && (
              <div className="text-gray-500">
                <div className="flex items-center gap-2 font-medium">
                  <BookOpen className="h-5 w-5" />
                  No modules yet.
                </div>
                {isInstructorOwner && (
                  <div className="text-sm mt-1">Use the Course Builder above to add your first module.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

