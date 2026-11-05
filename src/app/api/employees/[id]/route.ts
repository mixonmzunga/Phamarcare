import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('hr.edit')
    const { id } = await params
    const body = await req.json()
    const item = await db.employee.update({ where: { id }, data: { name: body.name, phone: body.phone || null, email: body.email || null, address: body.address || null, position: body.position || null, department: body.department || null, joiningDate: body.joiningDate ? new Date(body.joiningDate) : undefined, salary: Number(body.salary) || 0, status: body.status } })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('hr.delete')
    const { id } = await params
    await db.employee.update({ where: { id }, data: { status: 'INACTIVE' } })
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
