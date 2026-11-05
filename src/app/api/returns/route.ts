import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'sale'
    if (type === 'sale') {
      const items = await db.saleReturn.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { sale: { select: { invoiceNumber: true } }, items: true } })
      return NextResponse.json({ items })
    }
    const items = await db.purchaseReturn.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { purchase: { select: { invoiceNumber: true } }, items: true } })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('returns.create')
    const body = await req.json()
    const { saleId, items, reason, restock } = body
    const sale = await db.sale.findUnique({ where: { id: saleId }, include: { items: true } })
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    if (sale.status === 'CANCELLED') return NextResponse.json({ error: 'Cannot return a cancelled sale' }, { status: 400 })

    const result = await db.$transaction(async (tx) => {
      const year = new Date().getFullYear()
      const count = await tx.saleReturn.count({ where: { returnNumber: { startsWith: `SRET-${year}` } } })
      const returnNumber = `SRET-${year}-${String(count + 1).padStart(6, '0')}`
      const totalAmount = items.reduce((s: number, x: any) => s + x.total, 0)
      const refundAmount = totalAmount

      const ret = await tx.saleReturn.create({
        data: {
          returnNumber, saleId, customerId: sale.customerId, customerName: sale.customerName,
          totalAmount, refundAmount, reason, restock: restock ?? true, createdById: user.id,
          items: { create: items.map((it: any) => ({ medicineId: it.medicineId, batchId: it.batchId || null, name: it.name, quantity: it.quantity, unitPrice: it.unitPrice, total: it.total })) },
        },
      })

      if (restock) {
        for (const it of items) {
          if (it.batchId) {
            const batch = await tx.batch.findUnique({ where: { id: it.batchId } })
            if (batch) {
              await tx.batch.update({ where: { id: it.batchId }, data: { availableQty: batch.availableQty + it.quantity } })
              await tx.stockMovement.create({ data: { medicineId: it.medicineId, batchId: it.batchId, type: 'RETURN_IN', quantity: it.quantity, refType: 'SALE_RETURN', refId: ret.id, createdById: user.id } })
            }
          }
        }
      }
      await tx.sale.update({ where: { id: saleId }, data: { status: sale.status === 'COMPLETED' ? 'PARTIAL_RETURN' : 'PARTIAL_RETURN' } })
      return ret
    })
    return NextResponse.json({ item: result })
  } catch (e) { return errorResponse(e) }
}
