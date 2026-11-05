import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const items = await db.salaryPayment.findMany({ where: { employeeId: id }, orderBy: { paidAt: 'desc' } })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('hr.edit')
    const { id } = await params
    const body = await req.json()
    const emp = await db.employee.findUnique({ where: { id } })
    if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const netAmount = (Number(body.amount) || emp.salary) + (Number(body.bonus) || 0) - (Number(body.deductions) || 0)
    const item = await db.salaryPayment.create({ data: { employeeId: id, month: body.month, amount: Number(body.amount) || emp.salary, bonus: Number(body.bonus) || 0, deductions: Number(body.deductions) || 0, netAmount, status: 'PAID' } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}
