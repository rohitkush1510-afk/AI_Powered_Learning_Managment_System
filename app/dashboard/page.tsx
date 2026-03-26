'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import {
  BookOpen,
  TrendingUp,
  Brain,
  MessageSquare,
  Plus,
  LogOut,
  User,
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  instructor: { name: string }
  _count: { enrollments: number; modules: number }
}

interface Enrollment {
  id: string
  course: Course
  enrolledAt: string
}

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchData()
    }
  }, [user, authLoading])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      // Fetch enrollments for students
      if (user?.role === 'STUDENT') {
        const enrollRes = await fetch('/api/enrollments', { headers })
        const enrollData = await enrollRes.json()
        setEnrollments(enrollData.enrollments || [])
      }

      // Fetch courses
      const coursesRes = await fetch(
        user?.role === 'INSTRUCTOR' ? `/api/courses?instructorId=${user.id}` : '/api/courses?status=PUBLISHED',
        { headers }
      )
      const coursesData = await coursesRes.json()
      setCourses(coursesData.courses || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">{user.name}</span>
                <span className="text-sm text-gray-500">({user.role})</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">My Courses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {user.role === 'STUDENT' ? enrollments.length : courses.length}
                </p>
              </div>
              <BookOpen className="h-10 w-10 text-primary-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Recommendations</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <Brain className="h-10 w-10 text-primary-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <TrendingUp className="h-10 w-10 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8 flex space-x-4">
          {user.role === 'INSTRUCTOR' && (
            <Link
              href="/courses/create"
              className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              <span>Create Course</span>
            </Link>
          )}
          <Link
            href="/ai/chat"
            className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <MessageSquare className="h-5 w-5" />
            <span>AI Tutor</span>
          </Link>
          <Link
            href="/ai/recommendations"
            className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <Brain className="h-5 w-5" />
            <span>Get Recommendations</span>
          </Link>
        </div>

        {/* Courses Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {user.role === 'STUDENT' ? 'My Enrolled Courses' : 'My Courses'}
          </h2>
          {user.role === 'STUDENT' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No enrolled courses yet.</p>
                  <Link href="/courses" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
                    Browse Courses
                  </Link>
                </div>
              ) : (
                enrollments.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${enrollment.course.id}`}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                  >
                    <h3 className="text-lg font-semibold mb-2">{enrollment.course.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {enrollment.course.description}
                    </p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>By {enrollment.course.instructor.name}</span>
                      <span>{enrollment.course._count.modules} modules</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No courses yet.</p>
                  <Link href="/courses/create" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
                    Create Your First Course
                  </Link>
                </div>
              ) : (
                courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                  >
                    <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{course._count.enrollments} students</span>
                      <span>{course._count.modules} modules</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        {/* All Courses (for students) */}
        {user.role === 'STUDENT' && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Browse All Courses</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>By {course.instructor.name}</span>
                    <span>{course._count.modules} modules</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

