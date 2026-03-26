import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth'
import { generatePersonalizedRecommendations } from '@/lib/ai'

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

    // Get user progress
    const progress = await prisma.progress.findMany({
      where: {
        userId: user.id,
      },
      include: {
        course: true,
        module: true,
        lesson: true,
      },
    })

    // Generate AI recommendations
    const recommendations = await generatePersonalizedRecommendations(user.id, progress)

    // Save recommendations to database
    const savedRecommendations = await Promise.all(
      recommendations.map((rec) =>
        prisma.aIRecommendation.create({
          data: {
            userId: user.id,
            courseId: rec.courseId,
            type: rec.courseId ? 'course' : 'lesson',
            title: rec.reason,
            description: rec.reason,
            priority: rec.priority,
          },
        })
      )
    )

    return NextResponse.json({ recommendations: savedRecommendations })
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}

