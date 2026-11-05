import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse, hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const items = await db.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true, employeeId: true } })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('users.create')
    const body = await req.json()
    const exist = await db.user.findUnique({ where: { email: body.email.toLowerCase() } })
    if (exist) return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    const item = await db.user.create({ data: { name: body.name, email: body.email.toLowerCase(), passwordHash: hashPassword(body.password), role: body.role, phone: body.phone || null } })
    return NextResponse.json({ item: { ...item, passwordHash: undefined } })
  } catch (e) { return errorResponse(e) }
}
