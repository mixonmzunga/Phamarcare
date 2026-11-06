import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const where: any = {}
    if (q) where.OR = [{ invoiceNumber: { contains: q } }, { supplierName: { contains: q } }]
    if (from || to) {
      where.purchaseDate = {}
      if (from) where.purchaseDate.gte = new Date(from)
      if (to) where.purchaseDate.lte = new Date(to)
    }
    const items = await db.purchase.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
      include: { supplier: { select: { name: true } }, items: true, createdBy: { select: { name: true } } },
    })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}

const purchaseItemSchema = z.object({
  medicineId: z.string(),
  name: z.string(),
  batchNumber: z.string(),
  manufactureDate: z.string().optional().nullable(),
  expiryDate: z.string(),
  unitQuantity: z.number().int().positive(),
  purchasePrice: z.number(),
  sellingPrice: z.number(),
  total: z.number(),
})

const purchaseSchema = z.object({
  supplierId: z.string().optional().nullable(),
  supplierName: z.string(),
  purchaseDate: z.string(),
  discountAmount: z.number().default(0),
  vatAmount: z.number().default(0),
  totalAmount: z.number(),
  paidAmount: z.number(),
  paymentMethod: z.string(),
  note: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('purchases.create')
    const body = await req.json()
    const parsed = purchaseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const data = parsed.data

    const result = await db.$transaction(async (tx) => {
      const subTotal = data.items.reduce((s, x) => s + x.total, 0)
      const year = new Date().getFullYear()
      const prefix = (await tx.setting.findUnique({ where: { key: 'purchasePrefix' } }))?.value || 'PUR'
      const count = await tx.purchase.count({ where: { invoiceNumber: { startsWith: `${prefix}-${year}` } } })
      const invoiceNumber = `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`
      const dueAmount = Math.max(0, data.totalAmount - data.paidAmount)

      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber, supplierId: data.supplierId || null, supplierName: data.supplierName,
          purchaseDate: new Date(data.purchaseDate), subTotal, discountAmount: data.discountAmount,
          vatAmount: data.vatAmount, totalAmount: data.totalAmount, paidAmount: data.paidAmount,
          dueAmount, paymentMethod: data.paymentMethod, note: data.note, createdById: user.id,
          status: 'COMPLETED',
        },
      })

      for (const item of data.items) {
        // Create or update batch
        let batch = await tx.batch.findFirst({ where: { medicineId: item.medicineId, batchNumber: item.batchNumber } })
        if (batch) {
          batch = await tx.batch.update({
            where: { id: batch.id },
            data: {
              availableQty: batch.availableQty + item.unitQuantity,
              quantityPurchased: batch.quantityPurchased + item.unitQuantity,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              supplierId: data.supplierId || null,
              status: 'ACTIVE',
            },
          })
        } else {
          batch = await tx.batch.create({
            data: {
              batchNumber: item.batchNumber, medicineId: item.medicineId, supplierId: data.supplierId || null,
              manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
              expiryDate: new Date(item.expiryDate), purchaseDate: new Date(data.purchaseDate),
              purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice,
              quantityPurchased: item.unitQuantity, availableQty: item.unitQuantity, status: 'ACTIVE',
            },
          })
        }
        // Update medicine prices
        await tx.medicine.update({ where: { id: item.medicineId }, data: { purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice } })
        // Stock movement
        await tx.stockMovement.create({ data: { medicineId: item.medicineId, batchId: batch.id, type: 'PURCHASE', quantity: item.unitQuantity, refType: 'PURCHASE', refId: purchase.id, createdById: user.id } })
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id, medicineId: item.medicineId, batchId: batch.id, name: item.name,
            batchNumber: item.batchNumber, manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
            expiryDate: new Date(item.expiryDate), unitQuantity: item.unitQuantity, purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice, total: item.total,
          },
        })
      }
      return purchase
    })
    return NextResponse.json({ item: result })
  } catch (e) { return errorResponse(e) }
}
