import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('services.edit')
    const { id } = await params
    const body = await req.json()
    const item = await db.service.update({ where: { id }, data: { name: body.name, description: body.description || null, charge: Number(body.charge) || 0, vatPercent: Number(body.vatPercent) || 0, isActive: body.isActive } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('services.delete')
    const { id } = await params
    await db.service.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
