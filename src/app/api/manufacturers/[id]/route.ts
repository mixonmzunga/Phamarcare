import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('medicine.edit')
    const { id } = await params
    const body = await req.json()
    const item = await db.manufacturer.update({ where: { id }, data: { name: body.name, contact: body.contact, phone: body.phone, email: body.email, address: body.address } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('medicine.delete')
    const { id } = await params
    const count = await db.medicine.count({ where: { manufacturerId: id } })
    if (count > 0) return NextResponse.json({ error: 'Cannot delete: medicines are linked to this manufacturer' }, { status: 400 })
    await db.manufacturer.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
