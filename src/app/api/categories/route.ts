import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

async function list(model: 'category' | 'unit' | 'medicineType' | 'manufacturer') {
  const items = await (db as any)[model].findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ items })
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return list('category')
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('medicine.create')
    const body = await req.json()
    const item = await db.category.create({ data: { name: body.name, description: body.description } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}
