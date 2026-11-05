import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const items = await db.expense.findMany({ orderBy: { date: 'desc' }, take: 300, include: { createdBy: { select: { name: true } } } })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('expenses.create')
    const body = await req.json()
    const item = await db.expense.create({ data: { category: body.category, description: body.description || null, amount: Number(body.amount), paymentMethod: body.paymentMethod || 'CASH', date: body.date ? new Date(body.date) : new Date(), createdById: user.id } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}
