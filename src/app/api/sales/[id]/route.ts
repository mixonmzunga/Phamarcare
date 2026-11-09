import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const sale = await db.sale.findUnique({
      where: { id },
      include: { items: { include: { batch: true } }, cashier: { select: { name: true } }, customer: true },
    })
    if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ item: sale })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('sales.delete')
    const { id } = await params
    const sale = await db.sale.findUnique({ where: { id }, include: { items: true } })
    if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (sale.status === 'CANCELLED') return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })

    await db.$transaction(async (tx) => {
      // Restore stock
      for (const item of sale.items) {
        if (item.batchId) {
          const batch = await tx.batch.findUnique({ where: { id: item.batchId } })
          if (batch) {
            await tx.batch.update({ where: { id: item.batchId }, data: { availableQty: batch.availableQty + item.quantity } })
            await tx.stockMovement.create({ data: { medicineId: item.medicineId, batchId: item.batchId, type: 'RETURN_IN', quantity: item.quantity, refType: 'SALE_CANCEL', refId: sale.id, note: `Sale ${sale.invoiceNumber} cancelled` } })
          }
        }
      }
      await tx.sale.update({ where: { id }, data: { status: 'CANCELLED' } })
    })
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
