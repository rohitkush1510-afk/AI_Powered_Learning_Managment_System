import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { generateLessonMcqQuizFromContent } from '@/lib/ai'

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

    const { lessonId, numQuestions = 10 } = await req.json()

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    }

    const n = Math.min(20, Math.max(1, Number(numQuestions) || 10))

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: { select: { id: true, instructorId: true, status: true } },
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const course = lesson.module.course
    let quizUserId: string | null = null
    let quizTitle: string
    let quizDescription: string

    if (user.role === 'INSTRUCTOR' || user.role === 'ADMIN') {
      if (user.role !== 'ADMIN' && course.instructorId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      quizUserId = null
      quizTitle = `Quiz: ${lesson.title}`
      quizDescription = `AI-generated ${n}-question MCQ from this lesson (Sarvam).`
    } else if (user.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: course.id,
          },
        },
      })
      if (!enrollment || enrollment.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'You must be enrolled in this course to create a personal quiz.' },
          { status: 403 }
        )
      }
      if (course.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'This course is not available for students.' }, { status: 403 })
      }
      quizUserId = user.id
      quizTitle = `My practice quiz: ${lesson.title}`
      quizDescription = `Your personal ${n}-question MCQ from this lesson (Sarvam). Only you can see this.`
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!lesson.content?.trim()) {
      return NextResponse.json(
        { error: 'This lesson has no content. Add lesson text before generating a quiz.' },
        { status: 400 }
      )
    }

    const generated = await generateLessonMcqQuizFromContent(lesson.title, lesson.content, n)
    if (!generated.success) {
      return NextResponse.json({ error: generated.error }, { status: 502 })
    }

    const questions = generated.items

    const quiz = await prisma.quiz.create({
      data: {
        lessonId: lesson.id,
        userId: quizUserId,
        title: quizTitle,
        description: quizDescription,
        aiGenerated: true,
        questions: {
          create: questions.map((q, index: number) => ({
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
            aiGenerated: true,
            order: index + 1,
          })),
        },
      } as any,
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

