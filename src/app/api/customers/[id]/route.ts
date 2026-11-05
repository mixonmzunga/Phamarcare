import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await db.customer.findUnique({ where: { id }, include: { sales: { orderBy: { createdAt: 'desc' }, take: 50 }, payments: { orderBy: { createdAt: 'desc' }, take: 50 } } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const due = item.sales.reduce((s, x) => s + (x.status === 'COMPLETED' || x.status === 'PARTIAL_RETURN' ? x.dueAmount : 0), 0)
  return NextResponse.json({ item: { ...item, outstandingBalance: due } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('customers.edit')
    const { id } = await params
    const body = await req.json()
    const item = await db.customer.update({ where: { id }, data: { name: body.name, phone: body.phone || null, email: body.email || null, address: body.address || null, openingBalance: Number(body.openingBalance) || 0, creditLimit: Number(body.creditLimit) || 0, paymentDeadline: body.paymentDeadline || null, isActive: body.isActive } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('customers.delete')
    const { id } = await params
    const count = await db.sale.count({ where: { customerId: id } })
    if (count > 0) {
      await db.customer.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ ok: true, deactivated: true })
    }
    await db.customer.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
