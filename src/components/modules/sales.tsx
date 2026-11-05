'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, ConfirmDialog, BadgeStatus } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { formatMoney, formatDateTime, formatDate } from '@/lib/format'
import { Search, Eye, Printer, Trash2, Receipt } from 'lucide-react'

const PAYMENT_LABELS: Record<string, string> = { CASH: 'Cash', AIRTEL_MONEY: 'Airtel Money', TNM_MPAMBA: 'TNM Mpamba', BANK: 'Bank', CARD: 'Card', CREDIT: 'Credit' }

export function SalesModule() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('all')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [viewing, setViewing] = useState<any>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

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
  const totalSales = sales.filter((s: any) => s.status !== 'CANCELLED').reduce((s: number, x: any) => s + x.totalAmount, 0)
  const totalProfit = sales.filter((s: any) => s.status !== 'CANCELLED').reduce((s: number, x: any) => s + x.profitAmount, 0)

  return (
    <div>
      <PageHeader title="Sales Management" subtitle={`${sales.length} sale(s) · Total: ${formatMoney(totalSales)} · Profit: ${formatMoney(totalProfit)}`} />
      <Card className="border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search invoice or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={method} onValueChange={setMethod}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Methods</SelectItem>{Object.entries(PAYMENT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="COMPLETED">Completed</SelectItem><SelectItem value="CANCELLED">Cancelled</SelectItem><SelectItem value="PARTIAL_RETURN">Partial Return</SelectItem></SelectContent></Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
        </div>
      </Card>
      <Card className="border-slate-200 shadow-sm">
        {isLoading ? <div className="p-4"><LoadingState /></div> : sales.length === 0 ? <EmptyState title="No sales found" icon={Receipt} /> : (
          <div className="overflow-x-auto scroll-thin">
            <Table>
              <TableHeader><TableRow className="bg-slate-50">
                <TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Cashier</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-center">Method</TableHead><TableHead className="text-center">Status</TableHead>
                <TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sales.map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-800">{s.invoiceNumber}</TableCell>
                    <TableCell className="text-sm text-slate-600">{s.customerName}</TableCell>
                    <TableCell className="text-sm text-slate-600">{s.cashier?.name || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(s.totalAmount)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600">{formatMoney(s.profitAmount)}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary" className="text-xs">{PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod}</Badge></TableCell>
                    <TableCell className="text-center"><BadgeStatus status={s.status} /></TableCell>
                    <TableCell className="text-sm text-slate-500">{formatDateTime(s.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewing(s)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setViewing(s)} title="Print"><Printer className="w-4 h-4" /></Button>
                        {s.status === 'COMPLETED' && <Button variant="ghost" size="icon" onClick={() => setCancelId(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
        <DialogHeader><DialogTitle>Sale Invoice</DialogTitle></DialogHeader>
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
        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()} className="bg-primary"><Printer className="w-4 h-4 mr-2" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
