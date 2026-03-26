'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Play, CheckCircle, Clock, BookOpen } from 'lucide-react'

interface Lesson {
  id: string
  title: string
  content: string
  videoUrl: string | null
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
  modules: Module[]
}

export default function LearnPage() {
  const params = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

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
      setCourse(data.course)
      // Select first lesson by default
      if (data.course?.modules?.[0]?.lessons?.[0]) {
        setSelectedLesson(data.course.modules[0].lessons[0])
      }
    } catch (error) {
      console.error('Error fetching course:', error)
    } finally {
      setLoading(false)
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

