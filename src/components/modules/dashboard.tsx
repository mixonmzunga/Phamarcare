'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNav } from '@/lib/store'
import { formatMoney, formatDateTime, formatDate } from '@/lib/format'
import {
  ShoppingCart, Truck, TrendingUp, TrendingDown, Pill, Boxes, AlertTriangle,
  Users, Building2, Wallet, Receipt, DollarSign, ArrowUpRight, ArrowDownRight,
  CalendarClock, PackageX, Activity, Zap, Plus, BarChart3, PieChart as PieIcon,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, Legend, PieChart, Pie, Cell, Line, ComposedChart,
} from 'recharts'
import { cn } from '@/lib/utils'

function TrendBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0
  const isZero = pct === 0
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
      isZero ? 'trend-neutral' : isUp ? 'trend-up' : 'trend-down'
    )}>
      {isZero ? <Activity className="w-3 h-3" /> : isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function KpiCard({
  title, value, icon: Icon, accent, accentStyle, trend, subtitle, onClick,
}: {
  title: string
  value: string | number
  icon: any
  accent: string
  accentStyle?: React.CSSProperties
  trend?: number
  subtitle?: string
  onClick?: () => void
}) {
  return (
    <button onClick={onClick} className="text-left w-full">
      <div className="premium-card premium-card-hover p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('kpi-icon w-11 h-11', accent)} style={accentStyle}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && <TrendBadge pct={trend} />}
        </div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">{value}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </button>
  )
}

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
  const gradPrimary = { background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }
  const primaryCards = [
    { title: 'Sales Today', value: formatMoney(s.totalSalesToday || 0), icon: ShoppingCart, accent: 'text-white', accentStyle: gradPrimary, trend: s.salesTrend, subtitle: 'vs yesterday', onClick: () => setView('sales') },
    { title: "Today's Profit", value: formatMoney(s.profitToday || 0), icon: TrendingUp, accent: 'bg-emerald-100 text-emerald-600', trend: s.profitTrend, subtitle: 'vs yesterday', onClick: () => setView('reports') },
    { title: 'Purchases Today', value: formatMoney(s.totalPurchasesToday || 0), icon: Truck, accent: 'bg-sky-100 text-sky-600', trend: s.purchasesTrend, subtitle: 'vs yesterday', onClick: () => setView('purchases') },
    { title: 'Expenses Today', value: formatMoney(s.totalExpensesToday || 0), icon: Receipt, accent: 'bg-amber-100 text-amber-600', trend: s.expensesTrend, subtitle: 'vs yesterday', onClick: () => setView('expenses') },
  ]
  const secondaryCards = [
    { title: 'Total Medicines', value: s.totalMedicines || 0, icon: Pill, accent: 'text-white', accentStyle: gradPrimary, subtitle: 'in catalog', onClick: () => setView('medicines') },
    { title: 'Stock Value', value: formatMoney(s.stockValue || 0), icon: Boxes, accent: 'bg-sky-100 text-sky-600', subtitle: 'current inventory', onClick: () => setView('inventory') },
    { title: 'Net Profit (Month)', value: formatMoney(s.netProfit || 0), icon: DollarSign, accent: 'bg-emerald-100 text-emerald-600', subtitle: 'after expenses', onClick: () => setView('reports') },
    { title: 'Customers', value: s.totalCustomers || 0, icon: Users, accent: 'bg-violet-100 text-violet-600', subtitle: 'registered', onClick: () => setView('customers') },
    { title: 'Suppliers', value: s.totalSuppliers || 0, icon: Building2, accent: 'bg-teal-100 text-teal-600', subtitle: 'active', onClick: () => setView('suppliers') },
    { title: 'Customer Debts', value: formatMoney(s.customerDebt || 0), icon: Wallet, accent: 'bg-red-100 text-red-600', subtitle: 'outstanding', onClick: () => setView('customers') },
    { title: 'Supplier Debts', value: formatMoney(s.supplierDebt || 0), icon: Wallet, accent: 'bg-orange-100 text-orange-600', subtitle: 'payable', onClick: () => setView('suppliers') },
    { title: 'Low Stock Items', value: s.lowStockCount || 0, icon: AlertTriangle, accent: 'bg-amber-100 text-amber-600', subtitle: 'need reorder', onClick: () => setView('inventory') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Welcome back. Here's your pharmacy overview for{' '}
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setView('pos')} style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }} className="text-white border-0 hover:opacity-90 rounded-xl h-10 px-4 shadow-md shadow-blue-500/20">
            <ShoppingCart className="w-4 h-4 mr-2" /> New Sale
          </Button>
          <Button onClick={() => setView('purchases')} variant="outline" className="rounded-xl h-10 px-4 bg-white">
            <Truck className="w-4 h-4 mr-2" /> New Purchase
          </Button>
        </div>
      </div>

      {/* Primary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((c, i) => <KpiCard key={i} {...c} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales vs Purchases composed chart */}
        <div className="lg:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Sales vs Purchases</h3>
              <p className="text-xs text-slate-400">Weekly performance overview</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2F6BFF]" />Sales</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />Purchases</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data?.weeklyChart || []} barGap={4}>
              <defs>
                <linearGradient id="barSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F6BFF" stopOpacity={1} />
                  <stop offset="100%" stopColor="#A7C4F5" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="barPur" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14B8A6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#5EEAD4" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                formatter={(v: number) => formatMoney(v)}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 13 }}
                cursor={{ fill: '#F8FAFC' }}
              />
              <Bar dataKey="sales" name="Sales" fill="url(#barSales)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="purchases" name="Purchases" fill="url(#barPur)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Category donut */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Sales by Category</h3>
              <p className="text-xs text-slate-400">Revenue distribution</p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-300" />
          </div>
          {(!data?.salesByCategory || data.salesByCategory.length === 0) ? (
            <EmptyState title="No sales yet" description="Category breakdown will appear here" />
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={data.salesByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {data.salesByCategory.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatMoney(v)}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 13 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">Total</span>
                  <span className="text-base font-bold text-slate-800">
                    {formatMoney((data.salesByCategory || []).reduce((s: number, x: any) => s + x.value, 0))}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {data.salesByCategory.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="text-slate-600">{c.name}</span>
                    </span>
                    <span className="font-medium text-slate-700">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Secondary KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {secondaryCards.map((c, i) => <KpiCard key={i} {...c} />)}
      </div>

      {/* Monthly revenue + Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly revenue area chart */}
        <div className="lg:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Monthly Revenue & Profit</h3>
              <p className="text-xs text-slate-400">Last 6 months trend</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2F6BFF]" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />Profit</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data?.monthlyChart || []}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                formatter={(v: number) => formatMoney(v)}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: 13 }}
              />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2F6BFF" strokeWidth={2.5} fill="url(#rev)" />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#14B8A6" strokeWidth={2.5} fill="url(#prof)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expiry & Stock Health */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Stock Health</h3>
              <p className="text-xs text-slate-400">Batch expiry status</p>
            </div>
            <Activity className="w-4 h-4 text-slate-300" />
          </div>
          <div className="space-y-3">
            {/* Expired */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50/60 border border-red-100">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <PackageX className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">Expired</p>
                <p className="text-xs text-slate-400">{s.expiredCount || 0} batches need disposal</p>
              </div>
              <span className="text-lg font-bold text-red-600">{s.expiredCount || 0}</span>
            </div>
            {/* Expiring soon */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">Expiring Soon</p>
                <p className="text-xs text-slate-400">{s.expiringSoonCount || 0} batches within 60 days</p>
              </div>
              <span className="text-lg font-bold text-amber-600">{s.expiringSoonCount || 0}</span>
            </div>
            {/* Low stock */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50/60 border border-sky-100">
              <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">Low Stock</p>
                <p className="text-xs text-slate-400">{s.lowStockCount || 0} medicines need reorder</p>
              </div>
              <span className="text-lg font-bold text-sky-600">{s.lowStockCount || 0}</span>
            </div>
          </div>
          {/* Expiry breakdown bar */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Batch Distribution</p>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
              {(data?.expiryBreakdown || []).map((b: any, i: number) => (
                <div key={i} style={{ width: `${b.pct}%`, background: b.color }} title={`${b.label}: ${b.pct}%`} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {(data?.expiryBreakdown || []).map((b: any, i: number) => (
                <span key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                  {b.label} <span className="font-medium text-slate-700">{b.pct}%</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top selling */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Top Selling</h3>
              <p className="text-xs text-slate-400">Best performing medicines</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-300" />
          </div>
          {(!data?.topSelling || data.topSelling.length === 0) ? (
            <EmptyState title="No sales yet" description="Top sellers will appear here" />
          ) : (
            <div className="space-y-3">
              {data.topSelling.slice(0, 5).map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.qty} units sold</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{formatMoney(m.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Recent Sales</h3>
              <p className="text-xs text-slate-400">Latest transactions</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView('sales')} className="text-primary text-xs h-7">View All</Button>
          </div>
          {(!data?.recentSales || data.recentSales.length === 0) ? (
            <EmptyState title="No sales yet" />
          ) : (
            <div className="space-y-1">
              {data.recentSales.slice(0, 5).map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{sale.invoiceNumber}</p>
                    <p className="text-xs text-slate-400">{sale.customerName} · {formatDateTime(sale.createdAt)}</p>
                  </div>
                  <div className="text-right ml-2">
                    <span className="text-sm font-semibold text-slate-800">{formatMoney(sale.totalAmount)}</span>
                    <p className="text-[10px] text-emerald-600 font-medium">{formatMoney(sale.profitAmount)} profit</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Low Stock Alerts</h3>
              <p className="text-xs text-slate-400">Reorder needed</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView('inventory')} className="text-primary text-xs h-7">View All</Button>
          </div>
          {(!data?.lowStock || data.lowStock.length === 0) ? (
            <EmptyState title="All stocked up" description="No low stock alerts" />
          ) : (
            <div className="space-y-1">
              {data.lowStock.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{m.name}</p>
                    <p className="text-xs text-slate-400">Min level: {m.min} units</p>
                  </div>
                  <Badge variant="destructive" className="text-[10px] ml-2">{m.stock} left</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Quick Actions</h3>
            <p className="text-xs text-slate-400">Frequently used operations</p>
          </div>
          <Zap className="w-4 h-4 text-slate-300" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'New Sale', icon: ShoppingCart, view: 'pos' as const, accent: 'text-white', accentStyle: gradPrimary },
            { label: 'New Purchase', icon: Truck, view: 'purchases' as const, accent: 'bg-sky-100 text-sky-600' },
            { label: 'Add Medicine', icon: Plus, view: 'medicines' as const, accent: 'bg-violet-100 text-violet-600' },
            { label: 'Add Customer', icon: Users, view: 'customers' as const, accent: 'bg-teal-100 text-teal-600' },
            { label: 'Record Expense', icon: Receipt, view: 'expenses' as const, accent: 'bg-amber-100 text-amber-600' },
            { label: 'View Reports', icon: BarChart3, view: 'reports' as const, accent: 'bg-emerald-100 text-emerald-600' },
          ].map((a, i) => {
            const Icon = a.icon
            return (
              <button key={i} onClick={() => setView(a.view)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-slate-50 transition-colors group">
                <div className={cn('kpi-icon w-11 h-11 transition-transform group-hover:scale-110', a.accent)} style={(a as any).accentStyle}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700">{a.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
