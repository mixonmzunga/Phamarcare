'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, ConfirmDialog, BadgeStatus, StatCard } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { formatMoney, formatDateTime, formatDate } from '@/lib/format'
import { Search, Eye, Printer, Trash2, Receipt, TrendingUp, DollarSign, ShoppingCart, MoreVertical, Calendar, Filter, X } from 'lucide-react'

const PAYMENT_LABELS: Record<string, string> = { CASH: 'Cash', AIRTEL_MONEY: 'Airtel', TNM_MPAMBA: 'Mpamba', BANK: 'Bank', CARD: 'Card', CREDIT: 'Credit' }
const PAYMENT_COLORS: Record<string, string> = {
  CASH: 'bg-emerald-100 text-emerald-700',
  AIRTEL_MONEY: 'bg-red-100 text-red-700',
  TNM_MPAMBA: 'bg-blue-100 text-blue-700',
  BANK: 'bg-violet-100 text-violet-700',
  CARD: 'bg-amber-100 text-amber-700',
  CREDIT: 'bg-orange-100 text-orange-700',
}

export function SalesModule() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('all')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [viewing, setViewing] = useState<any>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sales', search, method, status, from, to],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (search) p.set('q', search)
      if (method !== 'all') p.set('method', method)
      if (status !== 'all') p.set('status', status)
      if (from) p.set('from', from)
      if (to) p.set('to', to)
      const res = await fetch(`/api/sales?${p}`)
      return res.json()
    },
  })

  const cancelMut = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Sale cancelled and stock restored'); qc.invalidateQueries({ queryKey: ['sales'] }); setCancelId(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const sales = data?.items || []
  const activeSales = sales.filter((s: any) => s.status !== 'CANCELLED')
  const totalSales = activeSales.reduce((s: number, x: any) => s + x.totalAmount, 0)
  const totalProfit = activeSales.reduce((s: number, x: any) => s + x.profitAmount, 0)
  const avgSale = activeSales.length > 0 ? totalSales / activeSales.length : 0
  const activeFilters = (method !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0)

  function clearFilters() {
    setMethod('all'); setStatus('all'); setFrom(''); setTo('')
  }

  return (
    <div>
      <PageHeader
        title="Sales Management"
        subtitle={`${sales.length} sale(s) recorded`}
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Sales" value={formatMoney(totalSales)} icon={DollarSign} color="success" sub={`${activeSales.length} transactions`} />
        <StatCard title="Total Profit" value={formatMoney(totalProfit)} icon={TrendingUp} color="primary" sub="from all sales" />
        <StatCard title="Avg Sale Value" value={formatMoney(avgSale)} icon={ShoppingCart} color="info" sub="per transaction" />
        <StatCard title="Cancelled" value={sales.filter((s: any) => s.status === 'CANCELLED').length} icon={Receipt} color="danger" sub="voided sales" />
      </div>

      {/* Search + Filter Bar */}
      <Card className="border-slate-200 shadow-sm p-3 sm:p-4 mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search invoice number or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 shrink-0 relative"
            >
              <Filter className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>
              )}
            </Button>
          </div>
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap pt-3 border-t border-slate-100">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-full sm:w-40 h-9 text-sm"><SelectValue placeholder="Payment Method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {Object.entries(PAYMENT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-36 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="PARTIAL_RETURN">Partial Return</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-36 h-9 text-sm" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-36 h-9 text-sm" />
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-slate-500">
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        {isLoading ? <div className="p-4"><LoadingState /></div> : sales.length === 0 ? (
          <EmptyState title="No sales found" description="Sales will appear here once transactions are made" icon={Receipt} />
        ) : (
          <>
            {/* Mobile: Card list with tap-to-view */}
            <div className="lg:hidden divide-y divide-slate-100">
              {sales.map((s: any) => (
                <div
                  key={s.id}
                  className="p-3.5 active:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setViewing(s)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.invoiceNumber}</p>
                      <p className="text-xs text-slate-400 truncate">{s.customerName} · {s.cashier?.name || ''}</p>
                    </div>
                    <BadgeStatus status={s.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PAYMENT_COLORS[s.paymentMethod] || 'bg-slate-100 text-slate-600'}`}>
                        {PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod}
                      </span>
                      <span className="text-[11px] text-slate-400">{formatDate(s.createdAt)}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{formatMoney(s.totalAmount)}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">{formatMoney(s.profitAmount)} profit</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Professional table */}
            <div className="hidden lg:block overflow-x-auto scroll-thin">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-center">Method</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right sticky right-0 bg-slate-50 z-10 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((s: any) => (
                      <TableRow key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setViewing(s)}>
                        <TableCell className="font-medium text-slate-800">{s.invoiceNumber}</TableCell>
                        <TableCell className="text-sm text-slate-600">{s.customerName}</TableCell>
                        <TableCell className="text-sm text-slate-600">{s.cashier?.name || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(s.totalAmount)}</TableCell>
                        <TableCell className="text-right text-sm text-emerald-600 font-medium">{formatMoney(s.profitAmount)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PAYMENT_COLORS[s.paymentMethod] || 'bg-slate-100 text-slate-600'}`}>
                            {PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod}
                          </span>
                        </TableCell>
                        <TableCell className="text-center"><BadgeStatus status={s.status} /></TableCell>
                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">{formatDateTime(s.createdAt)}</TableCell>
                        <TableCell className="text-right sticky right-0 bg-inherit z-10 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => setViewing(s)}><Eye className="w-4 h-4 mr-2" /> View Invoice</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewing(s)}><Printer className="w-4 h-4 mr-2" /> Print</DropdownMenuItem>
                              {s.status === 'COMPLETED' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setCancelId(s.id)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Cancel Sale</DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </Card>

      {viewing && <SaleDetailDialog sale={viewing} onClose={() => setViewing(null)} />}
      <ConfirmDialog open={!!cancelId} onOpenChange={(v) => !v && setCancelId(null)} title="Cancel Sale" description="This will cancel the sale and restore stock. This action cannot be undone." confirmText="Cancel Sale" destructive onConfirm={() => cancelId && cancelMut.mutate(cancelId)} />
    </div>
  )
}

function SaleDetailDialog({ sale, onClose }: { sale: any; onClose: () => void }) {
  const [details, setDetails] = useState<any>(null)
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: async () => (await fetch('/api/settings')).json() })
  useQuery({
    queryKey: ['sale', sale.id], queryFn: async () => {
      const res = await fetch(`/api/sales/${sale.id}`)
      const d = await res.json()
      setDetails(d.item)
      return d
    },
  })
  const items = details?.items || []
  const pharmacyName = settings?.pharmacyName || 'PharmaCare Pharmacy'
  const pharmacyAddress = settings?.pharmacyAddress || ''
  const pharmacyPhone = settings?.pharmacyPhone || ''

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Sale Invoice</DialogTitle></DialogHeader>
        <div className="print-area" id="invoice-print">
          <div className="text-center mb-3">
            <h2 className="font-bold text-lg">{pharmacyName}</h2>
            <p className="text-xs text-slate-500">{pharmacyAddress}</p>
            <p className="text-xs text-slate-500">{pharmacyPhone}</p>
          </div>
          <div className="text-xs border-t border-b border-dashed border-slate-300 py-2 mb-2 space-y-0.5">
            <div className="flex justify-between"><span>Invoice:</span><span className="font-medium">{sale.invoiceNumber}</span></div>
            <div className="flex justify-between"><span>Date:</span><span>{formatDateTime(sale.createdAt)}</span></div>
            <div className="flex justify-between"><span>Customer:</span><span>{sale.customerName}</span></div>
            <div className="flex justify-between"><span>Cashier:</span><span>{sale.cashier?.name || ''}</span></div>
            <div className="flex justify-between"><span>Payment:</span><span>{PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</span></div>
          </div>
          <table className="w-full text-xs mb-2">
            <thead><tr className="border-b border-slate-300"><th className="text-left py-1">Item</th><th className="text-center">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-b border-dashed border-slate-200">
                  <td className="py-1">{it.name}</td>
                  <td className="text-center">{it.quantity}</td>
                  <td className="text-right">{formatMoney(it.unitPrice)}</td>
                  <td className="text-right font-medium">{formatMoney(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-dashed border-slate-300 pt-2 text-xs space-y-0.5">
            <div className="flex justify-between"><span>Subtotal:</span><span>{formatMoney(sale.subTotal)}</span></div>
            {sale.discountAmount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatMoney(sale.discountAmount)}</span></div>}
            {sale.vatAmount > 0 && <div className="flex justify-between"><span>VAT:</span><span>{formatMoney(sale.vatAmount)}</span></div>}
            <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1"><span>TOTAL:</span><span>{formatMoney(sale.totalAmount)}</span></div>
            <div className="flex justify-between"><span>Paid:</span><span>{formatMoney(sale.paidAmount)}</span></div>
            {sale.changeAmount > 0 && <div className="flex justify-between"><span>Change:</span><span>{formatMoney(sale.changeAmount)}</span></div>}
            {sale.dueAmount > 0 && <div className="flex justify-between text-red-600"><span>Due:</span><span>{formatMoney(sale.dueAmount)}</span></div>}
          </div>
          <p className="text-center text-xs mt-3 text-slate-500">{settings?.receiptFooter || 'Thank you!'}</p>
        </div>
        <DialogFooter className="no-print flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
          <Button onClick={() => window.print()} className="flex-1" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}><Printer className="w-4 h-4 mr-2" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
