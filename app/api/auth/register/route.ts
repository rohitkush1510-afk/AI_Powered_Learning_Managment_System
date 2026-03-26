import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    let body: { email?: string; password?: string; name?: string; role?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { email, password, name, role = 'STUDENT' } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Create user
    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role.toUpperCase(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
      },
    })

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return NextResponse.json({ user, token })
  } catch (error: unknown) {
    console.error('Registration error:', error)
    const err = error as { code?: string; message?: string }
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    const msg = err.message ?? ''
    if (msg.toLowerCase().includes('database') || msg.toLowerCase().includes('prisma') || msg.toLowerCase().includes('connection')) {
      return NextResponse.json({
        error: 'Database not set up. Run: npx prisma generate && npx prisma migrate dev',
      }, { status: 500 })
    }
    return NextResponse.json({
      error: msg || 'Registration failed. Please try again.',
    }, { status: 500 })
  }
}

