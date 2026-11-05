import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission('customers.edit')
    const { id } = await params
    const body = await req.json()
    const amount = Number(body.amount)
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    const customer = await db.customer.findUnique({ where: { id } })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const year = new Date().getFullYear()
    const count = await db.customerPayment.count({ where: { receiptNumber: { startsWith: `RCPT-${year}` } } })
    const receiptNumber = `RCPT-${year}-${String(count + 1).padStart(6, '0')}`

    const payment = await db.customerPayment.create({
      data: { receiptNumber, customerId: id, amount, paymentMethod: body.paymentMethod || 'CASH', note: body.note, createdById: user.id },
    })

    // Apply payment to outstanding sales (FIFO)
    let remaining = amount
    const outstanding = await db.sale.findMany({ where: { customerId: id, status: { in: ['COMPLETED', 'PARTIAL_RETURN'] }, dueAmount: { gt: 0 } }, orderBy: { createdAt: 'asc' } })
    for (const sale of outstanding) {
      if (remaining <= 0) break
      const apply = Math.min(sale.dueAmount, remaining)
      await db.sale.update({ where: { id: sale.id }, data: { paidAmount: sale.paidAmount + apply, dueAmount: sale.dueAmount - apply } })
      remaining -= apply
    }
    return NextResponse.json({ item: payment })
  } catch (e) { return errorResponse(e) }
}
