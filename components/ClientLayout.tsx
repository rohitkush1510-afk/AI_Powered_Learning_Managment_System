'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Brain, LayoutDashboard, BookOpen, MessageSquare, Sparkles, LogOut, Plus } from 'lucide-react'
import { useAuth } from './AuthProvider'
import type { ReactNode } from 'react'

const NO_SHELL_ROUTES = new Set(['/', '/login', '/register'])

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const showShell = pathname ? !NO_SHELL_ROUTES.has(pathname) : true

  if (!showShell) return <>{children}</>

  const onLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary-600" />
              <span className="text-lg font-bold text-gray-900">Projexa LMS</span>
            </Link>

            <nav className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/dashboard' ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </span>
              </Link>
              <Link
                href="/courses"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname?.startsWith('/courses') ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Courses
                </span>
              </Link>
              <Link
                href="/ai/chat"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/ai/chat' ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Tutor
                </span>
              </Link>
              <Link
                href="/ai/recommendations"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/ai/recommendations' ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Recommendations
                </span>
              </Link>

              {user?.role === 'INSTRUCTOR' && (
                <Link
                  href="/courses/create"
                  className="ml-2 inline-flex items-center gap-2 bg-primary-600 text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4" />
                  Create
                </Link>
              )}

              {user && (
                <button
                  onClick={onLogout}
                  className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <div>{children}</div>
    </div>
  )
}


