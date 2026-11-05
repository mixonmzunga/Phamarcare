import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const medicine = await db.medicine.findUnique({
      where: { id },
      include: { category: true, type: true, manufacturer: true, unit: true, batches: { orderBy: { expiryDate: 'asc' } } },
    })
    if (!medicine) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ item: medicine })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('medicine.edit')
    const { id } = await params
    const body = await req.json()
    const existing = await db.medicine.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (body.barcode && body.barcode !== existing.barcode) {
      const dup = await db.medicine.findUnique({ where: { barcode: body.barcode } })
      if (dup) return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 })
    }
    const { id: _id, ...data } = body
    const medicine = await db.medicine.update({ where: { id }, data })
    return NextResponse.json({ item: medicine })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('medicine.delete')
    const { id } = await params
    const saleCount = await db.saleItem.count({ where: { medicineId: id } })
    const purchaseCount = await db.purchaseItem.count({ where: { medicineId: id } })
    if (saleCount > 0 || purchaseCount > 0) {
      await db.medicine.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ ok: true, deactivated: true })
    }
    await db.medicine.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
