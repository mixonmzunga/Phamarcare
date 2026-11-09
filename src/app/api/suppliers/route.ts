import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const items = await db.supplier.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('suppliers.create')
    const body = await req.json()
    const item = await db.supplier.create({ data: { name: body.name, contactPerson: body.contactPerson || null, phone: body.phone || null, email: body.email || null, address: body.address || null, openingBalance: Number(body.openingBalance) || 0, creditLimit: Number(body.creditLimit) || 0, paymentDeadline: body.paymentDeadline || null } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}
