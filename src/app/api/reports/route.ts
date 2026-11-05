import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, errorResponse } from '@/lib/auth'
import { startOfDay, endOfDay } from '@/lib/format'

export async function GET(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'sales'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = {}
    if (from || to) {
      const field = type === 'purchases' ? 'purchaseDate' : 'createdAt'
      where[field] = {}
      if (from) where[field].gte = startOfDay(new Date(from))
      if (to) where[field].lte = endOfDay(new Date(to))
    }

    if (type === 'sales') {
      where.status = { in: ['COMPLETED', 'PARTIAL_RETURN'] }
      const sales = await db.sale.findMany({ where, include: { items: true, cashier: { select: { name: true } } }, orderBy: { createdAt: 'desc' } })
      const total = sales.reduce((s, x) => s + x.totalAmount, 0)
      const profit = sales.reduce((s, x) => s + x.profitAmount, 0)
      return NextResponse.json({ items: sales, total, profit })
    }
    if (type === 'purchases') {
      where.status = 'COMPLETED'
      const purchases = await db.purchase.findMany({ where, include: { items: true, supplier: { select: { name: true } } }, orderBy: { createdAt: 'desc' } })
      const total = purchases.reduce((s, x) => s + x.totalAmount, 0)
      return NextResponse.json({ items: purchases, total })
    }
    if (type === 'profit-by-medicine') {
      const items = await db.saleItem.findMany({ where: { sale: { ...where, status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } }, include: { medicine: true } })
      const map = new Map<string, { name: string; qty: number; revenue: number; profit: number; cost: number }>()
      for (const it of items) {
        const cur = map.get(it.medicineId) || { name: it.name, qty: 0, revenue: 0, profit: 0, cost: 0 }
        cur.qty += it.quantity; cur.revenue += it.total; cur.profit += it.profit; cur.cost += it.costPrice
        map.set(it.medicineId, cur)
      }
      const result = Array.from(map.values()).sort((a, b) => b.profit - a.profit)
      return NextResponse.json({ items: result, total: result.reduce((s, x) => s + x.revenue, 0), profit: result.reduce((s, x) => s + x.profit, 0) })
    }
    if (type === 'profit-by-category') {
      const items = await db.saleItem.findMany({ where: { sale: { ...where, status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } }, include: { medicine: { include: { category: true } } } })
      const map = new Map<string, { name: string; qty: number; revenue: number; profit: number }>()
      for (const it of items) {
        const cat = it.medicine.category?.name || 'Uncategorized'
        const cur = map.get(cat) || { name: cat, qty: 0, revenue: 0, profit: 0 }
        cur.qty += it.quantity; cur.revenue += it.total; cur.profit += it.profit
        map.set(cat, cur)
      }
      const result = Array.from(map.values()).sort((a, b) => b.profit - a.profit)
      return NextResponse.json({ items: result })
    }
    if (type === 'inventory-valuation') {
      const batches = await db.batch.findMany({ where: { status: 'ACTIVE' }, include: { medicine: true } })
      const items = batches.map((b) => ({ name: b.medicine.name, batch: b.batchNumber, qty: b.availableQty, cost: b.purchasePrice, value: b.availableQty * b.purchasePrice, expiry: b.expiryDate }))
      const total = items.reduce((s, x) => s + x.value, 0)
      return NextResponse.json({ items, total })
    }
    if (type === 'expenses') {
      const expenses = await db.expense.findMany({ where, orderBy: { date: 'desc' }, include: { createdBy: { select: { name: true } } } })
      const total = expenses.reduce((s, x) => s + x.amount, 0)
      return NextResponse.json({ items: expenses, total })
    }
    if (type === 'income-statement') {
      const sales = await db.sale.findMany({ where: { ...where, status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } }, include: { items: true } })
      const revenue = sales.reduce((s, x) => s + x.subTotal, 0)
      const cogs = sales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.costPrice, 0), 0)
      const grossProfit = revenue - cogs
      const expWhere: any = {}
      if (from || to) { expWhere.date = {}; if (from) expWhere.date.gte = startOfDay(new Date(from)); if (to) expWhere.date.lte = endOfDay(new Date(to)) }
      const expenses = await db.expense.findMany({ where: expWhere })
      const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0)
      const netProfit = grossProfit - totalExpenses
      return NextResponse.json({ revenue, cogs, grossProfit, totalExpenses, netProfit, salesCount: sales.length })
    }
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  } catch (e) { return errorResponse(e) }
}
