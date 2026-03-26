'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Send, Brain, User } from 'lucide-react'

interface Message {
  id: string
  message: string
  isAI: boolean
  createdAt: string
}

export default function AIChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setError('')

    // Add user message to UI immediately
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      message: userMessage,
      isAI: false,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Server error (${res.status})`)
      } else if (data.aiMessage) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          {
            id: data.userMessage.id,
            message: data.userMessage.message,
            isAI: false,
            createdAt: data.userMessage.createdAt,
          },
          {
            id: data.aiMessage.id,
            message: data.aiMessage.message,
            isAI: true,
            createdAt: data.aiMessage.createdAt,
          },
        ])
      } else {
        setError('Unexpected server response.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Network error: could not reach server.')
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        {
          ...tempUserMsg,
          message: userMessage + ' (Error sending message)',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary-600" />
            <h1 className="text-xl font-semibold">AI Tutor</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex flex-col">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-12">
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Start a conversation with your AI tutor!</p>
              <p className="text-sm mt-2">Ask questions about your courses or get help with learning.</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.isAI
                    ? 'bg-white border border-gray-200'
                    : 'bg-primary-600 text-white'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.isAI ? (
                    <Brain className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{message.message}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 animate-pulse" />
                  <span className="text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t bg-white p-4 rounded-lg shadow">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask your AI tutor..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="h-5 w-5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
