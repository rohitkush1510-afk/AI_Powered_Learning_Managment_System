import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'

/** Course quizzes (userId null) are visible to everyone; personal quizzes only to their owner. */
function applyQuizVisibility(course: { modules: { lessons: { quizzes?: unknown[] }[] }[] }, viewerId: string | null) {
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      const list = lesson.quizzes as { userId: string | null }[] | undefined
      if (!list?.length) continue
      lesson.quizzes = list.filter(
        (q) => q.userId == null || (viewerId != null && q.userId === viewerId)
      )
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        modules: {
          include: {
            lessons: {
              include: {
                quizzes: {
                  include: {
                    questions: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
            _count: {
              select: {
                lessons: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const authHeader = req.headers.get('authorization')
    let viewerId: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      const viewer = await getUserFromToken(authHeader.substring(7))
      if (viewer) viewerId = viewer.id
    }
    applyQuizVisibility(course, viewerId)

    return NextResponse.json({ course })
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await getUserFromToken(token)

    const course = await prisma.course.findUnique({
      where: { id: params.id },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (user?.role !== 'ADMIN' && course.instructorId !== user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const data = await req.json()

    if (typeof data.status !== 'undefined') {
      const allowedStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED']
      if (!allowedStatuses.includes(data.status)) {
        return NextResponse.json({ error: 'Invalid course status' }, { status: 400 })
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id: params.id },
      data,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ course: updatedCourse })
  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }
}

