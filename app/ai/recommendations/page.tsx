'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Brain, Sparkles, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface Recommendation {
  id: string
  type: string
  title: string
  description: string
  priority: number
  courseId?: string
}

export default function RecommendationsPage() {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/ai/recommendations', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchRecommendations()
    }
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-primary-600" />
            <h1 className="text-3xl font-bold">AI Recommendations</h1>
          </div>
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Sparkles className="h-5 w-5" />
            <span>{loading ? 'Generating...' : 'Refresh Recommendations'}</span>
          </button>
        </div>

        {loading && recommendations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-500">Generating personalized recommendations...</div>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No recommendations yet.</p>
            <p className="text-sm text-gray-400 mt-2">
              Complete some courses to get personalized recommendations!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations
              .sort((a, b) => b.priority - a.priority)
              .map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Brain className="h-6 w-6 text-primary-600 flex-shrink-0" />
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                      Priority {rec.priority}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{rec.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{rec.description}</p>
                  {rec.courseId && (
                    <Link
                      href={`/courses/${rec.courseId}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>View Course</span>
                    </Link>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

