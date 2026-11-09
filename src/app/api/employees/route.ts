import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const items = await db.employee.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { salaries: true, attendance: true } } } })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('hr.create')
    const body = await req.json()
    const count = await db.employee.count()
    const employeeCode = body.employeeCode || `EMP${String(count + 1).padStart(3, '0')}`
    const item = await db.employee.create({ data: { employeeCode, name: body.name, phone: body.phone || null, email: body.email || null, address: body.address || null, position: body.position || null, department: body.department || null, joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(), salary: Number(body.salary) || 0, status: body.status || 'ACTIVE', image: body.image || null } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}
