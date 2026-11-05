import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission('suppliers.edit')
    const { id } = await params
    const body = await req.json()
    const amount = Number(body.amount)
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    const supplier = await db.supplier.findUnique({ where: { id } })
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

    const year = new Date().getFullYear()
    const count = await db.supplierPayment.count({ where: { voucherNumber: { startsWith: `SPAY-${year}` } } })
    const voucherNumber = `SPAY-${year}-${String(count + 1).padStart(6, '0')}`

    const payment = await db.supplierPayment.create({
      data: { voucherNumber, supplierId: id, amount, paymentMethod: body.paymentMethod || 'CASH', note: body.note, createdById: user.id },
    })

    let remaining = amount
    const outstanding = await db.purchase.findMany({ where: { supplierId: id, status: 'COMPLETED', dueAmount: { gt: 0 } }, orderBy: { createdAt: 'asc' } })
    for (const pur of outstanding) {
      if (remaining <= 0) break
      const apply = Math.min(pur.dueAmount, remaining)
      await db.purchase.update({ where: { id: pur.id }, data: { paidAmount: pur.paidAmount + apply, dueAmount: pur.dueAmount - apply } })
      remaining -= apply
    }
    return NextResponse.json({ item: payment })
  } catch (e) { return errorResponse(e) }
}
