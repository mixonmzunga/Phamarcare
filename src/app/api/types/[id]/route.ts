import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('medicine.edit')
    const { id } = await params
    const body = await req.json()
    const item = await db.medicineType.update({ where: { id }, data: { name: body.name } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('medicine.delete')
    const { id } = await params
    const count = await db.medicine.count({ where: { typeId: id } })
    if (count > 0) return NextResponse.json({ error: 'Cannot delete: medicines are using this type' }, { status: 400 })
    await db.medicineType.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
