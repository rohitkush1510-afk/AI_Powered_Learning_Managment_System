import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { generateAITutorResponse } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, courseId, lessonId } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    // Get context if course/lesson provided
    let context: any = {}
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true },
      })
      context.courseTitle = course?.title
    }
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { title: true, content: true },
      })
      context.lessonTitle = lesson?.title
      context.courseContent = lesson?.content
    }

    // Pull recent user-specific chat history for memory-aware responses
    const recentMessages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { isAI: true, message: true },
    })

    const chatHistory = recentMessages.reverse().map((m) => ({
      isAI: m.isAI,
      message: m.message,
    }))

    // Generate AI response
    const aiResponse = await generateAITutorResponse(message, context, chatHistory)

    // Save messages to database
    const userMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        message,
        isAI: false,
      },
    })

    const aiMessage = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        message: aiResponse,
        response: aiResponse,
        isAI: true,
      },
    })

    return NextResponse.json({
      userMessage,
      aiMessage,
    })
  } catch (error) {
    console.error('Error in AI chat:', error)
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 })
  }
}

