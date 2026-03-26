import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

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

    const { courseId, moduleId, lessonId, completed, progress, timeSpent } = await req.json()

    if (!courseId && !moduleId && !lessonId) {
      return NextResponse.json({ error: 'Missing courseId, moduleId, or lessonId' }, { status: 400 })
    }

    // Find existing progress or create new
    const existing = await prisma.progress.findFirst({
      where: {
        userId: user.id,
        courseId: courseId || null,
        moduleId: moduleId || null,
        lessonId: lessonId || null,
      },
    })

    const progressData = {
      userId: user.id,
      courseId: courseId || null,
      moduleId: moduleId || null,
      lessonId: lessonId || null,
      completed: completed ?? false,
      progress: progress ?? 0,
      timeSpent: timeSpent ?? 0,
      lastAccessed: new Date(),
    }

    const progressRecord = existing
      ? await prisma.progress.update({
          where: { id: existing.id },
          data: progressData,
        })
      : await prisma.progress.create({
          data: progressData,
        })

    return NextResponse.json({ progress: progressRecord })
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')
    const moduleId = searchParams.get('moduleId')
    const lessonId = searchParams.get('lessonId')

    const where: any = { userId: user.id }
    if (courseId) where.courseId = courseId
    if (moduleId) where.moduleId = moduleId
    if (lessonId) where.lessonId = lessonId

    const progress = await prisma.progress.findMany({
      where,
      include: {
        course: true,
        module: true,
        lesson: true,
      },
      orderBy: {
        lastAccessed: 'desc',
      },
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

