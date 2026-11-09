import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const items = await db.serviceInvoice.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { customer: { select: { name: true } }, service: { select: { name: true } } } })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('services.create')
    const body = await req.json()
    const service = await db.service.findUnique({ where: { id: body.serviceId } })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    const charge = service.charge
    const vatAmount = charge * (service.vatPercent / 100)
    const totalAmount = charge + vatAmount
    const count = await db.serviceInvoice.count()
    const invoiceNumber = `SVC-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`
    const item = await db.serviceInvoice.create({
      data: {
        invoiceNumber, customerId: body.customerId || null, customerName: body.customerName || 'Walk-in',
        serviceId: body.serviceId, serviceName: service.name, charge, vatPercent: service.vatPercent, vatAmount,
        totalAmount, paidAmount: body.paymentMethod === 'CREDIT' ? 0 : totalAmount, paymentMethod: body.paymentMethod || 'CASH', status: 'COMPLETED',
      },
    })
    return NextResponse.json({ item })
  } catch (e) { return errorResponse(e) }
}
