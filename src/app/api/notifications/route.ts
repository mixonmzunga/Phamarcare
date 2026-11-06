import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, errorResponse } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') || 50)
    const items = await db.notification.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
    const unread = await db.notification.count({ where: { isRead: false } })
    return NextResponse.json({ items, unread })
  } catch (e) { return errorResponse(e) }
}

// Generate notifications on demand (called by system)
export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    if (body.action === 'generate') {
      return await generateNotifications()
    }
    if (body.action === 'markAllRead') {
      await db.notification.updateMany({ where: { isRead: false }, data: { isRead: true } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) { return errorResponse(e) }
}

export async function generateNotifications() {
  const now = new Date()
  const expiryAlertDays = Number((await db.setting.findUnique({ where: { key: 'expiryAlertDays' } }))?.value || 60)
  const lowStockThreshold = Number((await db.setting.findUnique({ where: { key: 'lowStockThreshold' } }))?.value || 15)
  const created: any[] = []

  // Low stock
  const meds = await db.medicine.findMany({ where: { isActive: true }, include: { batches: { where: { status: 'ACTIVE' } } } })
  for (const m of meds) {
    const total = m.batches.reduce((s, b) => s + b.availableQty, 0)
    if (total <= m.minStockLevel) {
      const exists = await db.notification.findFirst({ where: { type: 'LOW_STOCK', refId: m.id, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } })
      if (!exists) {
        created.push(await db.notification.create({ data: { type: 'LOW_STOCK', title: 'Low Stock Alert', message: `${m.name} is low on stock (${total} units left, min: ${m.minStockLevel})`, severity: 'WARNING', refId: m.id } }))
      }
    }
  }

  // Expiring soon & expired
  const batches = await db.batch.findMany({ where: { status: 'ACTIVE', availableQty: { gt: 0 } }, include: { medicine: true } })
  for (const b of batches) {
    const diffDays = Math.round((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) {
      const exists = await db.notification.findFirst({ where: { type: 'EXPIRED', refId: b.id, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } })
      if (!exists) created.push(await db.notification.create({ data: { type: 'EXPIRED', title: 'Expired Medicine', message: `${b.medicine.name} batch ${b.batchNumber} has expired`, severity: 'CRITICAL', refId: b.id } }))
    } else if (diffDays <= expiryAlertDays) {
      const exists = await db.notification.findFirst({ where: { type: 'EXPIRY', refId: b.id, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } })
      if (!exists) created.push(await db.notification.create({ data: { type: 'EXPIRY', title: 'Expiring Soon', message: `${b.medicine.name} batch ${b.batchNumber} expires in ${diffDays} days`, severity: 'WARNING', refId: b.id } }))
    }
  }

  // Outstanding customer debts
  const customers = await db.customer.findMany({ where: { isActive: true }, include: { sales: { where: { status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } } } })
  for (const c of customers) {
    const due = c.sales.reduce((s, x) => s + x.dueAmount, 0)
    if (due > 0) {
      const exists = await db.notification.findFirst({ where: { type: 'DEBT', refId: c.id, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } })
      if (!exists) created.push(await db.notification.create({ data: { type: 'DEBT', title: 'Outstanding Debt', message: `${c.name} owes ${due.toLocaleString()} MWK`, severity: 'WARNING', refId: c.id } }))
    }
  }

  return NextResponse.json({ created: created.length, items: created })
}
