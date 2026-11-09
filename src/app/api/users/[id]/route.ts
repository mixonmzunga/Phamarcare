import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse, hashPassword } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('users.edit')
    const { id } = await params
    const body = await req.json()
    const data: any = { name: body.name, role: body.role, phone: body.phone, isActive: body.isActive }
    if (body.password) data.passwordHash = hashPassword(body.password)
    if (body.email && body.email !== (await db.user.findUnique({ where: { id } }))?.email) {
      const dup = await db.user.findUnique({ where: { email: body.email.toLowerCase() } })
      if (dup) return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      data.email = body.email.toLowerCase()
    }
    const item = await db.user.update({ where: { id }, data })
    return NextResponse.json({ item: { ...item, passwordHash: undefined } })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('users.delete')
    const { id } = await params
    await db.user.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
