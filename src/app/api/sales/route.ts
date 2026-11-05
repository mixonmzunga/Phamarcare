import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, errorResponse } from '@/lib/auth'
import { startOfDay, endOfDay } from '@/lib/format'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const method = searchParams.get('method')
    const status = searchParams.get('status')
    const limit = Number(searchParams.get('limit') || 200)

    const where: any = {}
    if (q) where.OR = [{ invoiceNumber: { contains: q } }, { customerName: { contains: q } }]
    if (method && method !== 'all') where.paymentMethod = method
    if (status && status !== 'all') where.status = status
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = startOfDay(new Date(from))
      if (to) where.createdAt.lte = endOfDay(new Date(to))
    }
    const items = await db.sale.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
      include: { cashier: { select: { name: true } }, customer: { select: { name: true } }, items: true },
    })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}
