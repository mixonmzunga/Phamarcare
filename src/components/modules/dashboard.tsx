'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader, StatCard, LoadingState, EmptyState } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNav } from '@/lib/store'
import { formatMoney, formatDateTime } from '@/lib/format'
import {
  ShoppingCart, Truck, TrendingUp, Pill, Boxes, AlertTriangle,
  Users, Building2, Wallet, Receipt, DollarSign, Activity, ExpiryAlert,
} from '@/lib/icons'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { Badge } from '@/components/ui/badge'

const PIE_COLORS = ['#0ea5e9', '#14b8a6', '#6366f1', '#f59e0b', '#ef4444']

export function DashboardModule() {
  const { setView } = useNav()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Pharmacy overview and key metrics" />
        <LoadingState rows={6} />
      </div>
    )
  }

  const s = data?.stats || {}
  const stats = [
    { title: 'Sales Today', value: formatMoney(s.totalSalesToday || 0), icon: ShoppingCart, color: 'primary' as const, action: () => setView('sales') },
    { title: 'Purchases Today', value: formatMoney(s.totalPurchasesToday || 0), icon: Truck, color: 'info' as const, action: () => setView('purchases') },
    { title: "Today's Profit", value: formatMoney(s.profitToday || 0), icon: TrendingUp, color: 'success' as const },
    { title: 'Net Profit (Month)', value: formatMoney(s.netProfit || 0), icon: DollarSign, color: 'success' as const },
    { title: 'Total Medicines', value: s.totalMedicines || 0, icon: Pill, color: 'primary' as const, action: () => setView('medicines') },
    { title: 'Stock Value', value: formatMoney(s.stockValue || 0), icon: Boxes, color: 'info' as const, action: () => setView('inventory') },
    { title: 'Low Stock', value: s.lowStockCount || 0, icon: AlertTriangle, color: 'warning' as const, action: () => setView('inventory') },
    { title: 'Expired', value: s.expiredCount || 0, icon: ExpiryAlert, color: 'danger' as const, action: () => setView('inventory') },
    { title: 'Expiring Soon', value: s.expiringSoonCount || 0, icon: Activity, color: 'warning' as const, action: () => setView('inventory') },
    { title: 'Customers', value: s.totalCustomers || 0, icon: Users, color: 'secondary' as const, action: () => setView('customers') },
    { title: 'Suppliers', value: s.totalSuppliers || 0, icon: Building2, color: 'secondary' as const, action: () => setView('suppliers') },
    { title: 'Customer Debts', value: formatMoney(s.customerDebt || 0), icon: Wallet, color: 'danger' as const, action: () => setView('customers') },
    { title: 'Supplier Debts', value: formatMoney(s.supplierDebt || 0), icon: Wallet, color: 'danger' as const, action: () => setView('suppliers') },
    { title: 'Expenses Today', value: formatMoney(s.totalExpensesToday || 0), icon: Receipt, color: 'danger' as const, action: () => setView('expenses') },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back. Here's your pharmacy overview for ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`}
        actions={
          <>
            <Button onClick={() => setView('pos')} className="bg-primary"><ShoppingCart className="w-4 h-4 mr-2" /> New Sale</Button>
            <Button onClick={() => setView('purchases')} variant="outline"><Truck className="w-4 h-4 mr-2" /> New Purchase</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {stats.map((stat, i) => (
          <button key={i} onClick={stat.action} className="text-left">
            <StatCard {...stat} />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">Weekly Sales vs Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.weeklyChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sales" name="Sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">Monthly Revenue & Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.monthlyChart || []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" fill="url(#rev)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#14b8a6" fill="url(#prof)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">Top Selling Medicines</CardTitle>
          </CardHeader>
          <CardContent>
            {(!data?.topSelling || data.topSelling.length === 0) ? (
              <EmptyState title="No sales yet" description="Sales data will appear here" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.topSelling} dataKey="qty" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                    {data.topSelling.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-700">Recent Sales</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('sales')} className="text-primary text-xs">View All</Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[220px] overflow-y-auto scroll-thin">
            {(!data?.recentSales || data.recentSales.length === 0) ? (
              <EmptyState title="No sales yet" />
            ) : (
              data.recentSales.map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{sale.invoiceNumber}</p>
                    <p className="text-xs text-slate-400">{sale.customerName} · {formatDateTime(sale.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{formatMoney(sale.totalAmount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-700">Low Stock Alerts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('inventory')} className="text-primary text-xs">View All</Button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[220px] overflow-y-auto scroll-thin">
            {(!data?.lowStock || data.lowStock.length === 0) ? (
              <EmptyState title="All stocked up" description="No low stock alerts" />
            ) : (
              data.lowStock.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{m.name}</p>
                    <p className="text-xs text-slate-400">Min: {m.min} units</p>
                  </div>
                  <Badge variant="destructive">{m.stock} left</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
