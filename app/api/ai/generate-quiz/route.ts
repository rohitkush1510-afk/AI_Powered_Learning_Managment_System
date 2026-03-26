import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { generateQuizQuestions } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await getUserFromToken(token)

    if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { lessonId, numQuestions = 5 } = await req.json()

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    }

    // Get lesson content
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        content: true,
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Generate quiz questions using AI
    const questions = await generateQuizQuestions(lesson.content, lesson.title, numQuestions)

    // Create quiz
    const quiz = await prisma.quiz.create({
      data: {
        lessonId: lesson.id,
        title: `Quiz: ${lesson.title}`,
        description: 'AI-generated quiz',
        aiGenerated: true,
        questions: {
          create: questions.map((q: any, index: number) => ({
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
            aiGenerated: true,
            order: index + 1,
          })),
        },
      },
      include: {
        questions: true,
      },
    })

    return NextResponse.json({ quiz })
  } catch (error) {
    console.error('Error generating quiz:', error)
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }
}

