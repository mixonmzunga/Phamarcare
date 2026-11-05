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
    const categoryId = searchParams.get('categoryId')
    const typeId = searchParams.get('typeId')
    const all = searchParams.get('all') === '1'

    const where: any = {}
    if (!all) where.isActive = true
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { genericName: { contains: q } },
        { barcode: { contains: q } },
        { productCode: { contains: q } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (typeId) where.typeId = typeId

    const medicines = await db.medicine.findMany({
      where,
      include: {
        category: true, type: true, manufacturer: true, unit: true,
        batches: { where: { status: 'ACTIVE' } },
      },
      orderBy: { name: 'asc' },
    })

    const result = medicines.map((m) => {
      const totalStock = m.batches.reduce((s, b) => s + b.availableQty, 0)
      return { ...m, totalStock }
    })
    return NextResponse.json({ items: result })
  } catch (e) {
    return errorResponse(e)
  }
}

const medicineSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  typeId: z.string().optional().nullable(),
  manufacturerId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  productCode: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  boxQuantity: z.number().int().default(1),
  stripsPerBox: z.number().int().default(0),
  tabletsPerStrip: z.number().int().default(0),
  purchasePrice: z.number().default(0),
  sellingPrice: z.number().default(0),
  discountPercent: z.number().default(0),
  vatPercent: z.number().default(0),
  minStockLevel: z.number().int().default(10),
  description: z.string().optional().nullable(),
  prescription: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  try {
    await requirePermission('medicine.create')
    const body = await req.json()
    const parsed = medicineSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const data = parsed.data
    if (data.barcode) {
      const exist = await db.medicine.findUnique({ where: { barcode: data.barcode } })
      if (exist) return NextResponse.json({ error: 'Barcode already exists' }, { status: 400 })
    }
    if (data.productCode) {
      const exist = await db.medicine.findUnique({ where: { productCode: data.productCode } })
      if (exist) return NextResponse.json({ error: 'Product code already exists' }, { status: 400 })
    }
    // auto product code if empty
    if (!data.productCode) {
      const count = await db.medicine.count()
      data.productCode = `MED${String(count + 1).padStart(4, '0')}`
    }
    const medicine = await db.medicine.create({ data: data as any })
    return NextResponse.json({ item: medicine })
  } catch (e) {
    return errorResponse(e)
  }
}
