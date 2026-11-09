import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const status = searchParams.get('status') || 'ACTIVE'
    const expiryAlert = searchParams.get('expiryAlert') === '1'

    const where: any = {}
    if (status !== 'all') where.status = status
    if (expiryAlert) {
      const alertDays = Number((await db.setting.findUnique({ where: { key: 'expiryAlertDays' } }))?.value || 60)
      const future = new Date(); future.setDate(future.getDate() + alertDays)
      where.expiryDate = { lte: future }
    }
    if (q) {
      const meds = await db.medicine.findMany({ where: { OR: [{ name: { contains: q } }, { barcode: { contains: q } }, { productCode: { contains: q } }] }, select: { id: true } })
      where.medicineId = { in: meds.map((m) => m.id) }
    }
    const items = await db.batch.findMany({
      where, orderBy: { expiryDate: 'asc' },
      include: { medicine: true, supplier: { select: { name: true } } },
    })
    // Mark expired
    const now = new Date()
    const result = items.map((b) => {
      const isExpired = new Date(b.expiryDate) < now
      const diffDays = Math.round((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { ...b, isExpired, daysToExpiry: diffDays }
    })
    return NextResponse.json({ items: result })
  } catch (e) { return errorResponse(e) }
}
