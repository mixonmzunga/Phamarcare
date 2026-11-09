import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'
import { z } from 'zod'

const checkoutSchema = z.object({
  items: z.array(z.object({
    medicineId: z.string(),
    name: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number(),
    discountPercent: z.number().default(0),
    vatPercent: z.number().default(0),
  })),
  customerId: z.string().optional().nullable(),
  customerName: z.string(),
  subTotal: z.number(),
  discountPercent: z.number().default(0),
  discountAmount: z.number().default(0),
  vatPercent: z.number().default(0),
  vatAmount: z.number().default(0),
  totalAmount: z.number(),
  paidAmount: z.number(),
  paymentMethod: z.string(),
  note: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('pos.create')
    const body = await req.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const data = parsed.data

    // FEFO: pick batches ordered by expiry date asc for each medicine
    const result = await db.$transaction(async (tx) => {
      let subTotal = 0
      const saleItems: any[] = []

      for (const item of data.items) {
        const batches = await tx.batch.findMany({
          where: { medicineId: item.medicineId, status: 'ACTIVE', availableQty: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        })
        // check expired batches - skip them
        const now = new Date()
        const valid = batches.filter((b) => new Date(b.expiryDate) > now)
        if (valid.length === 0) {
          throw new Error(`No valid (non-expired) stock for ${item.name}`)
        }
        const totalAvail = valid.reduce((s, b) => s + b.availableQty, 0)
        if (totalAvail < item.quantity) {
          throw new Error(`Insufficient stock for ${item.name}. Available: ${totalAvail}, requested: ${item.quantity}`)
        }

        let remaining = item.quantity
        let costTotal = 0
        for (const batch of valid) {
          if (remaining <= 0) break
          const take = Math.min(batch.availableQty, remaining)
          await tx.batch.update({ where: { id: batch.id }, data: { availableQty: batch.availableQty - take } })
          await tx.stockMovement.create({
            data: { medicineId: item.medicineId, batchId: batch.id, type: 'SALE', quantity: -take, refType: 'SALE', note: `Sale checkout` },
          })
          costTotal += take * batch.purchasePrice
          remaining -= take
          if (remaining <= 0) {
            const lineDiscount = item.unitPrice * take * (item.discountPercent / 100)
            const lineVat = (item.unitPrice * take - lineDiscount) * (item.vatPercent / 100)
            const lineTotal = item.unitPrice * take - lineDiscount + lineVat
            const profit = lineTotal - lineVat - costTotal
            subTotal += item.unitPrice * take
            saleItems.push({
              medicineId: item.medicineId, batchId: batch.id, name: item.name, quantity: item.quantity,
              unitPrice: item.unitPrice, discountPercent: item.discountPercent, vatPercent: item.vatPercent,
              total: lineTotal, costPrice: costTotal, profit,
            })
          }
        }
      }

      // Generate invoice number
      const year = new Date().getFullYear()
      const prefix = (await tx.setting.findUnique({ where: { key: 'invoicePrefix' } }))?.value || 'INV'
      const count = await tx.sale.count({ where: { invoiceNumber: { startsWith: `${prefix}-${year}` } } })
      const invoiceNumber = `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`

      const dueAmount = Math.max(0, data.totalAmount - data.paidAmount)
      const changeAmount = Math.max(0, data.paidAmount - data.totalAmount)
      const profitAmount = saleItems.reduce((s, x) => s + x.profit, 0)

      const sale = await tx.sale.create({
        data: {
          invoiceNumber, customerId: data.customerId || null, customerName: data.customerName,
          cashierId: user.id, subTotal, discountPercent: data.discountPercent, discountAmount: data.discountAmount,
          vatPercent: data.vatPercent, vatAmount: data.vatAmount, totalAmount: data.totalAmount,
          paidAmount: data.paidAmount, dueAmount, changeAmount, paymentMethod: data.paymentMethod,
          status: 'COMPLETED', profitAmount, note: data.note,
          items: { create: saleItems },
        },
        include: { items: true },
      })

      // If credit sale, customer balance is implicit via dueAmount
      // If customer payment, record it
      if (data.paidAmount > 0 && data.customerId && data.paymentMethod === 'CREDIT') {
        // credit sale - no payment record, due remains
      }

      return sale
    })

    return NextResponse.json({ sale: result })
  } catch (e: any) {
    if (e.message && (e.message.includes('Insufficient') || e.message.includes('No valid'))) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return errorResponse(e)
  }
}
