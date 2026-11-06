import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { startOfDay, endOfDay } from '@/lib/format'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    const [
      salesToday, purchasesToday, medicinesCount, customersCount, suppliersCount,
      expensesToday, allBatches, recentSales, recentPurchases, lowStockMeds,
    ] = await Promise.all([
      db.sale.findMany({ where: { createdAt: { gte: todayStart, lte: todayEnd }, status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } }),
      db.purchase.findMany({ where: { purchaseDate: { gte: todayStart, lte: todayEnd }, status: 'COMPLETED' } }),
      db.medicine.count({ where: { isActive: true } }),
      db.customer.count({ where: { isActive: true } }),
      db.supplier.count({ where: { isActive: true } }),
      db.expense.findMany({ where: { date: { gte: todayStart, lte: todayEnd } } }),
      db.batch.findMany({ where: { status: 'ACTIVE' }, include: { medicine: true } }),
      db.sale.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { cashier: { select: { name: true } } } }),
      db.purchase.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { supplier: { select: { name: true } } } }),
      db.medicine.findMany({ where: { isActive: true }, include: { batches: { where: { status: 'ACTIVE' } } } }),
    ])

    const totalSalesToday = salesToday.reduce((s, x) => s + x.totalAmount, 0)
    const profitToday = salesToday.reduce((s, x) => s + x.profitAmount, 0)
    const totalPurchasesToday = purchasesToday.reduce((s, x) => s + x.totalAmount, 0)
    const totalExpensesToday = expensesToday.reduce((s, x) => s + x.amount, 0)

    const stockValue = allBatches.reduce((s, b) => s + b.availableQty * b.purchasePrice, 0)

    // Expiry analysis
    const expiryAlertDays = Number((await db.setting.findUnique({ where: { key: 'expiryAlertDays' } }))?.value || 60)
    let expiringSoon = 0
    let expired = 0
    for (const b of allBatches) {
      const exp = new Date(b.expiryDate)
      const diffDays = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) expired++
      else if (diffDays <= expiryAlertDays) expiringSoon++
    }

    // Low stock
    const lowStock = lowStockMeds.filter((m) => {
      const total = m.batches.reduce((s, b) => s + b.availableQty, 0)
      return total <= m.minStockLevel
    })

    // Outstanding balances
    const customers = await db.customer.findMany({ include: { sales: { where: { status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } } } })
    const customerDebt = customers.reduce((s, c) => {
      const due = c.sales.reduce((d, sale) => d + sale.dueAmount, 0)
      return s + Math.max(0, due - c.openingBalance)
    }, 0)

    const suppliers = await db.supplier.findMany({ include: { purchases: { where: { status: 'COMPLETED' } } } })
    const supplierDebt = suppliers.reduce((s, sup) => {
      const due = sup.purchases.reduce((d, p) => d + p.dueAmount, 0)
      return s + Math.max(0, due - sup.openingBalance)
    }, 0)

    // Last 7 days sales
    const days: { label: string; sales: number; purchases: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = startOfDay(d)
      const de = endOfDay(d)
      const [s, p] = await Promise.all([
        db.sale.aggregate({ _sum: { totalAmount: true }, where: { createdAt: { gte: ds, lte: de }, status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } }),
        db.purchase.aggregate({ _sum: { totalAmount: true }, where: { purchaseDate: { gte: ds, lte: de }, status: 'COMPLETED' } }),
      ])
      days.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), sales: s._sum.totalAmount || 0, purchases: p._sum.totalAmount || 0 })
    }

    // Monthly revenue (last 6 months)
    const months: { label: string; revenue: number; profit: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const ms = new Date(d.getFullYear(), d.getMonth(), 1)
      const me = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const sales = await db.sale.findMany({ where: { createdAt: { gte: ms, lte: me }, status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } })
      months.push({
        label: d.toLocaleDateString('en', { month: 'short' }),
        revenue: sales.reduce((s, x) => s + x.totalAmount, 0),
        profit: sales.reduce((s, x) => s + x.profitAmount, 0),
      })
    }

    // Top selling medicines
    const saleItems = await db.saleItem.findMany({
      where: { sale: { status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } },
      include: { medicine: true },
    })
    const medMap = new Map<string, { name: string; qty: number; revenue: number; profit: number }>()
    for (const it of saleItems) {
      const key = it.medicineId
      const cur = medMap.get(key) || { name: it.name, qty: 0, revenue: 0, profit: 0 }
      cur.qty += it.quantity
      cur.revenue += it.total
      cur.profit += it.profit
      medMap.set(key, cur)
    }
    const topSelling = Array.from(medMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5)
    const topProfit = Array.from(medMap.values()).sort((a, b) => b.profit - a.profit).slice(0, 5)

    // Net profit (this month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthSales = await db.sale.aggregate({ _sum: { profitAmount: true }, where: { createdAt: { gte: monthStart }, status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } })
    const monthExpenses = await db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart } } })
    const netProfit = (monthSales._sum.profitAmount || 0) - (monthExpenses._sum.amount || 0)

    // Yesterday comparison for trend percentages
    const yesterdayStart = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const yesterdayEnd = endOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const [ySales, yPurchases, yExpenses] = await Promise.all([
      db.sale.aggregate({ _sum: { totalAmount: true, profitAmount: true }, where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd }, status: { in: ['COMPLETED', 'PARTIAL_RETURN'] } } }),
      db.purchase.aggregate({ _sum: { totalAmount: true }, where: { purchaseDate: { gte: yesterdayStart, lte: yesterdayEnd }, status: 'COMPLETED' } }),
      db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: yesterdayStart, lte: yesterdayEnd } } }),
    ])
    const ySalesTotal = ySales._sum.totalAmount || 0
    const yProfit = ySales._sum.profitAmount || 0
    const yPurchasesTotal = yPurchases._sum.totalAmount || 0
    const yExpensesTotal = yExpenses._sum.amount || 0

    function trendPct(today: number, yesterday: number): number {
      if (yesterday === 0) return today > 0 ? 100 : 0
      return ((today - yesterday) / yesterday) * 100
    }

    // Sales by category (donut)
    const categoryMap = new Map<string, { name: string; value: number; color: string }>()
    const palette = ['#2F6BFF', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#84CC16']
    for (const it of saleItems) {
      const cat = it.medicine?.category?.name || 'Other'
      const cur = categoryMap.get(cat) || { name: cat, value: 0, color: palette[categoryMap.size % palette.length] }
      cur.value += it.total
      categoryMap.set(cat, cur)
    }
    const salesByCategoryRaw = Array.from(categoryMap.values()).sort((a, b) => b.value - a.value).slice(0, 6)
    const salesByCategoryTotal = salesByCategoryRaw.reduce((s, x) => s + x.value, 0) || 1
    const salesByCategory = salesByCategoryRaw.map((c) => ({ ...c, pct: +(c.value / salesByCategoryTotal * 100).toFixed(1) }))

    // Expiry breakdown list
    const expiryBreakdown: { label: string; pct: number; color: string }[] = []
    const totalBatches = allBatches.length || 1
    expiryBreakdown.push({ label: 'Expired', pct: +(expired / totalBatches * 100).toFixed(1), color: '#EF4444' })
    expiryBreakdown.push({ label: 'Expiring Soon', pct: +(expiringSoon / totalBatches * 100).toFixed(1), color: '#F59E0B' })
    expiryBreakdown.push({ label: 'Safe Stock', pct: +((totalBatches - expired - expiringSoon) / totalBatches * 100).toFixed(1), color: '#10B981' })

    return NextResponse.json({
      stats: {
        totalSalesToday,
        totalPurchasesToday,
        profitToday,
        totalMedicines: medicinesCount,
        stockValue,
        lowStockCount: lowStock.length,
        expiredCount: expired,
        expiringSoonCount: expiringSoon,
        totalCustomers: customersCount,
        totalSuppliers: suppliersCount,
        customerDebt,
        supplierDebt,
        totalExpensesToday,
        netProfit,
        // Trends (today vs yesterday)
        salesTrend: trendPct(totalSalesToday, ySalesTotal),
        purchasesTrend: trendPct(totalPurchasesToday, yPurchasesTotal),
        profitTrend: trendPct(profitToday, yProfit),
        expensesTrend: trendPct(totalExpensesToday, yExpensesTotal),
      },
      weeklyChart: days,
      monthlyChart: months,
      topSelling,
      topProfit,
      recentSales,
      recentPurchases,
      salesByCategory,
      expiryBreakdown,
      lowStock: lowStock.slice(0, 5).map((m) => ({
        id: m.id,
        name: m.name,
        stock: m.batches.reduce((s, b) => s + b.availableQty, 0),
        min: m.minStockLevel,
      })),
    })
  } catch (e) {
    console.error('Dashboard error:', e)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
