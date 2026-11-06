'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatMoney, formatDate } from '@/lib/format'
import { Printer, Download, BarChart3, TrendingUp, Package, FileText } from 'lucide-react'

export function ReportsModule() {
  const [tab, setTab] = useState('sales')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Comprehensive business reports with date filtering" actions={<Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>} />
      <Card className="border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div><Label className="text-xs mb-1 block">From Date</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs mb-1 block">To Date</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        </div>
      </Card>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100 flex-wrap h-auto">
          <TabsTrigger value="sales"><TrendingUp className="w-4 h-4 mr-1.5" /> Sales</TabsTrigger>
          <TabsTrigger value="purchases"><FileText className="w-4 h-4 mr-1.5" /> Purchases</TabsTrigger>
          <TabsTrigger value="profit"><BarChart3 className="w-4 h-4 mr-1.5" /> Profit</TabsTrigger>
          <TabsTrigger value="inventory"><Package className="w-4 h-4 mr-1.5" /> Inventory</TabsTrigger>
          <TabsTrigger value="income"><FileText className="w-4 h-4 mr-1.5" /> Income Statement</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="mt-4"><SalesReport from={from} to={to} /></TabsContent>
        <TabsContent value="purchases" className="mt-4"><PurchaseReport from={from} to={to} /></TabsContent>
        <TabsContent value="profit" className="mt-4"><ProfitReport from={from} to={to} /></TabsContent>
        <TabsContent value="inventory" className="mt-4"><InventoryReport /></TabsContent>
        <TabsContent value="income" className="mt-4"><IncomeReport from={from} to={to} /></TabsContent>
      </Tabs>
    </div>
  )
}

function useReport(type: string, from: string, to: string) {
  return useQuery({ queryKey: ['report', type, from, to], queryFn: async () => { const p = new URLSearchParams({ type }); if (from) p.set('from', from); if (to) p.set('to', to); const res = await fetch(`/api/reports?${p}`); return res.json() } })
}

function SalesReport({ from, to }: any) {
  const { data, isLoading } = useReport('sales', from, to)
  if (isLoading) return <LoadingState />
  const items = data?.items || []
  return (
    <Card className="border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100 flex justify-between"><h3 className="font-semibold">Sales Report</h3><div className="text-sm"><span className="text-slate-500">Total: </span><span className="font-bold text-primary">{formatMoney(data?.total || 0)}</span> <span className="text-slate-500 ml-3">Profit: </span><span className="font-bold text-emerald-600">{formatMoney(data?.profit || 0)}</span></div></div>
      {items.length === 0 ? <EmptyState title="No sales in this period" /> : (
        <div className="overflow-x-auto scroll-thin">
          <div className="min-w-[640px]">
            <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Cashier</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Profit</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>{items.map((s: any) => (<TableRow key={s.id}><TableCell className="font-medium">{s.invoiceNumber}</TableCell><TableCell className="text-sm text-slate-600">{s.customerName}</TableCell><TableCell className="text-sm text-slate-600">{s.cashier?.name}</TableCell><TableCell className="text-right">{formatMoney(s.totalAmount)}</TableCell><TableCell className="text-right text-emerald-600">{formatMoney(s.profitAmount)}</TableCell><TableCell className="text-sm text-slate-500">{formatDate(s.createdAt)}</TableCell></TableRow>))}</TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  )
}

function PurchaseReport({ from, to }: any) {
  const { data, isLoading } = useReport('purchases', from, to)
  if (isLoading) return <LoadingState />
  const items = data?.items || []
  return (
    <Card className="border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100 flex justify-between"><h3 className="font-semibold">Purchase Report</h3><div className="text-sm"><span className="text-slate-500">Total: </span><span className="font-bold text-primary">{formatMoney(data?.total || 0)}</span></div></div>
      {items.length === 0 ? <EmptyState title="No purchases in this period" /> : (
        <div className="overflow-x-auto scroll-thin">
          <div className="min-w-[640px]">
            <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Invoice</TableHead><TableHead>Supplier</TableHead><TableHead className="text-center">Items</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>{items.map((p: any) => (<TableRow key={p.id}><TableCell className="font-medium">{p.invoiceNumber}</TableCell><TableCell className="text-sm text-slate-600">{p.supplierName}</TableCell><TableCell className="text-center text-sm">{p.items?.length}</TableCell><TableCell className="text-right">{formatMoney(p.totalAmount)}</TableCell><TableCell className="text-sm text-slate-500">{formatDate(p.purchaseDate)}</TableCell></TableRow>))}</TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  )
}

function ProfitReport({ from, to }: any) {
  const [sub, setSub] = useState('medicine')
  const { data, isLoading } = useReport(`profit-by-${sub}`, from, to)
  if (isLoading) return <LoadingState />
  const items = data?.items || []
  return (
    <Card className="border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-semibold">Profit Report</h3><Select value={sub} onValueChange={setSub}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="medicine">By Medicine</SelectItem><SelectItem value="category">By Category</SelectItem></SelectContent></Select></div>
      {items.length === 0 ? <EmptyState title="No data in this period" /> : (
        <div className="overflow-x-auto scroll-thin">
          <div className="min-w-[640px]">
            <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead className="text-center">Qty Sold</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead><TableHead className="text-right">Margin</TableHead></TableRow></TableHeader>
              <TableBody>{items.map((it: any, i: number) => (<TableRow key={i}><TableCell className="font-medium">{it.name}</TableCell><TableCell className="text-center">{it.qty}</TableCell><TableCell className="text-right">{formatMoney(it.revenue)}</TableCell><TableCell className="text-right text-emerald-600">{formatMoney(it.profit)}</TableCell><TableCell className="text-right text-sm">{it.revenue > 0 ? `${((it.profit / it.revenue) * 100).toFixed(1)}%` : '-'}</TableCell></TableRow>))}</TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  )
}

function InventoryReport() {
  const { data, isLoading } = useReport('inventory-valuation', '', '')
  if (isLoading) return <LoadingState />
  const items = data?.items || []
  return (
    <Card className="border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100 flex justify-between"><h3 className="font-semibold">Inventory Valuation</h3><div className="text-sm"><span className="text-slate-500">Total Stock Value: </span><span className="font-bold text-primary">{formatMoney(data?.total || 0)}</span></div></div>
      {items.length === 0 ? <EmptyState title="No inventory" /> : (
        <div className="overflow-x-auto scroll-thin">
          <div className="min-w-[640px]">
            <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Medicine</TableHead><TableHead>Batch</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Expiry</TableHead></TableRow></TableHeader>
              <TableBody>{items.map((it: any, i: number) => (<TableRow key={i}><TableCell className="font-medium">{it.name}</TableCell><TableCell className="font-mono text-xs">{it.batch}</TableCell><TableCell className="text-center">{it.qty}</TableCell><TableCell className="text-right">{formatMoney(it.cost)}</TableCell><TableCell className="text-right font-medium">{formatMoney(it.value)}</TableCell><TableCell className="text-sm text-slate-500">{formatDate(it.expiry)}</TableCell></TableRow>))}</TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  )
}

function IncomeReport({ from, to }: any) {
  const { data, isLoading } = useReport('income-statement', from, to)
  if (isLoading) return <LoadingState />
  const d = data || {}
  return (
    <Card className="border-slate-200 shadow-sm p-6">
      <h3 className="font-semibold text-lg mb-4">Income Statement</h3>
      <div className="space-y-3 max-w-md">
        <Line label="Sales Revenue" value={d.revenue} />
        <Line label="Cost of Goods Sold (COGS)" value={-d.cogs} />
        <div className="border-t border-slate-200 pt-2"><Line label="Gross Profit" value={d.grossProfit} bold /></div>
        <Line label="Operating Expenses" value={-d.totalExpenses} />
        <div className="border-t-2 border-slate-300 pt-2"><Line label="Net Profit" value={d.netProfit} bold /></div>
      </div>
      <p className="text-xs text-slate-400 mt-4">{d.salesCount || 0} sales transactions included in this report.</p>
    </Card>
  )
}

function Line({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? 'font-bold text-base' : 'text-sm'}`}><span className={bold ? 'text-slate-800' : 'text-slate-600'}>{label}</span><span className={value < 0 ? 'text-red-600' : 'text-emerald-600'}>{formatMoney(value)}</span></div>
}
