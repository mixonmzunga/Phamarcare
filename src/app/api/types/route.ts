import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const items = await db.medicineType.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('medicine.create')
    const body = await req.json()
    const item = await db.medicineType.create({ data: { name: body.name } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}
