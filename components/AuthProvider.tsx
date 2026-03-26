'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
  avatar?: string
}

/** Shape of /api/auth/login and /api/auth/register JSON responses */
interface AuthApiResponse {
  token?: string
  user?: User | null
  error?: string
}

/** Shape of /api/auth/me JSON response */
interface MeResponse {
  user?: User | null
  error?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, role: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data: MeResponse) => {
          if (data.user) setUser(data.user)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const text = await res.text()
      let data: AuthApiResponse
      try {
        data = text ? (JSON.parse(text) as AuthApiResponse) : {}
      } catch {
        throw new Error(
          res.ok
            ? 'Invalid response from server.'
            : `Server error (${res.status}). The app may need the database set up. Run: npx prisma generate && npx prisma migrate dev`
        )
      }

      if (!res.ok) {
        throw new Error(data.error || `Login failed: ${res.status} ${res.statusText}`)
      }

      if (data.token && data.user) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
      } else {
        throw new Error(data.error || 'Login failed: Missing token or user data')
      }
    } catch (error: unknown) {
      if (error instanceof Error) throw error
      throw new Error('Network error: Unable to connect to server')
    }
  }

  const register = async (email: string, password: string, name: string, role: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
      })

      const text = await res.text()
      let data: AuthApiResponse
      try {
        data = text ? (JSON.parse(text) as AuthApiResponse) : {}
      } catch {
        throw new Error(
          res.ok
            ? 'Invalid response from server.'
            : `Server error (${res.status}). The app may need the database set up. Run: npx prisma generate && npx prisma migrate dev`
        )
      }

      if (!res.ok) {
        throw new Error(data.error || `Registration failed: ${res.status} ${res.statusText}`)
      }

      if (data.token && data.user) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
      } else {
        throw new Error(data.error || 'Registration failed: Missing token or user data')
      }
    } catch (error: unknown) {
      if (error instanceof Error) throw error
      throw new Error('Network error: Unable to connect to server')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

