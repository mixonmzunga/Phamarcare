import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('expenses.delete')
    const { id } = await params
    await db.expense.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
