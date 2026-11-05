'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, BadgeStatus } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { formatMoney, formatDateTime, formatDate } from '@/lib/format'
import { Search, Eye, Plus, Truck, Trash2, X } from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' }, { value: 'AIRTEL_MONEY', label: 'Airtel Money' }, { value: 'TNM_MPAMBA', label: 'TNM Mpamba' }, { value: 'BANK', label: 'Bank Transfer' }, { value: 'CREDIT', label: 'Credit' },
]

interface PurchaseLine { medicineId: string; name: string; batchNumber: string; manufactureDate: string; expiryDate: string; unitQuantity: number; purchasePrice: number; sellingPrice: number; total: number }

export function PurchasesModule() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewing, setViewing] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', search, from, to],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (search) p.set('q', search)
      if (from) p.set('from', from)
      if (to) p.set('to', to)
      const res = await fetch(`/api/purchases?${p}`)
      return res.json()
    },
  })

  const purchases = data?.items || []
  const totalAmount = purchases.reduce((s: number, x: any) => s + x.totalAmount, 0)

  return (
    <div>
      <PageHeader title="Purchase Management" subtitle={`${purchases.length} purchase(s) · Total: ${formatMoney(totalAmount)}`} actions={<Button onClick={() => setDialogOpen(true)} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> New Purchase</Button>} />
      <Card className="border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search invoice or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
        </div>
      </Card>
      <Card className="border-slate-200 shadow-sm">
        {isLoading ? <div className="p-4"><LoadingState /></div> : purchases.length === 0 ? <EmptyState title="No purchases found" icon={Truck} action={<Button onClick={() => setDialogOpen(true)} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> New Purchase</Button>} /> : (
          <div className="overflow-x-auto scroll-thin">
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead>Invoice</TableHead><TableHead>Supplier</TableHead><TableHead className="text-center">Items</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Due</TableHead><TableHead className="text-center">Method</TableHead><TableHead className="text-center">Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {purchases.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-800">{p.invoiceNumber}</TableCell>
                    <TableCell className="text-sm text-slate-600">{p.supplierName}</TableCell>
                    <TableCell className="text-center text-sm">{p.items?.length || 0}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(p.totalAmount)}</TableCell>
                    <TableCell className="text-right text-sm">{formatMoney(p.paidAmount)}</TableCell>
                    <TableCell className="text-right text-sm text-red-600">{p.dueAmount > 0 ? formatMoney(p.dueAmount) : '-'}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary" className="text-xs">{p.paymentMethod}</Badge></TableCell>
                    <TableCell className="text-center"><BadgeStatus status={p.status} /></TableCell>
                    <TableCell className="text-sm text-slate-500">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setViewing(p)}><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      {dialogOpen && <NewPurchaseDialog onClose={() => setDialogOpen(false)} />}
      {viewing && <PurchaseDetailDialog purchase={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function NewPurchaseDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { data: medData } = useQuery({ queryKey: ['medicines-all'], queryFn: async () => (await fetch('/api/medicines?all=1')).json() })
  const { data: supData } = useQuery({ queryKey: ['suppliers'], queryFn: async () => (await fetch('/api/suppliers')).json() })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: async () => (await fetch('/api/settings')).json() })
  const [supplierId, setSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paidAmount, setPaidAmount] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [vatAmount, setVatAmount] = useState(0)
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<PurchaseLine[]>([])
  const [medSearch, setMedSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const medicines = (medData?.items || []).filter((m: any) => !medSearch || m.name.toLowerCase().includes(medSearch.toLowerCase()) || m.barcode?.includes(medSearch))
  const supplier = supData?.items?.find((s: any) => s.id === supplierId)

  function addMedicine(m: any) {
    setLines((prev) => [...prev, {
      medicineId: m.id, name: m.name, batchNumber: `BTH-${m.productCode}-${new Date().getFullYear()}`,
      manufactureDate: '', expiryDate: '', unitQuantity: 10, purchasePrice: m.purchasePrice, sellingPrice: m.sellingPrice,
      total: m.purchasePrice * 10,
    }])
    setMedSearch('')
  }
  function updateLine(idx: number, patch: Partial<PurchaseLine>) {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l
      const next = { ...l, ...patch }
      next.total = next.unitQuantity * next.purchasePrice
      return next
    }))
  }
  function removeLine(idx: number) { setLines((prev) => prev.filter((_, i) => i !== idx)) }

  const subTotal = lines.reduce((s, x) => s + x.total, 0)
  const totalAmount = subTotal - discountAmount + vatAmount

  async function save() {
    if (!supplierId) { toast.error('Select a supplier'); return }
    if (lines.length === 0) { toast.error('Add at least one medicine'); return }
    for (const l of lines) { if (!l.expiryDate) { toast.error(`Set expiry date for ${l.name}`); return } }
    setSaving(true)
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId, supplierName: supplier?.name || '', purchaseDate, discountAmount, vatAmount, totalAmount,
          paidAmount: paymentMethod === 'CREDIT' ? 0 : (paidAmount || totalAmount), paymentMethod, note,
          items: lines,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Purchase recorded. Stock updated.')
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto scroll-thin">
        <DialogHeader><DialogTitle>New Purchase</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2">
          <div><Label className="text-xs mb-1 block">Supplier *</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{supData?.items?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs mb-1 block">Purchase Date</Label><Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></div>
          <div><Label className="text-xs mb-1 block">Payment Method</Label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs mb-1 block">{paymentMethod === 'CREDIT' ? 'Paid (0 for credit)' : 'Paid Amount'}</Label><Input type="number" value={paidAmount || ''} onChange={(e) => setPaidAmount(Number(e.target.value))} disabled={paymentMethod === 'CREDIT'} placeholder={String(totalAmount)} /></div>
        </div>
        <div className="border border-slate-200 rounded-lg">
          <div className="p-2 border-b border-slate-200 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search medicine to add..." value={medSearch} onChange={(e) => setMedSearch(e.target.value)} className="pl-9 h-9" />
            {medSearch && medicines.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto scroll-thin">
                {medicines.slice(0, 8).map((m: any) => (
                  <button key={m.id} onClick={() => addMedicine(m)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
                    <span>{m.name}</span><span className="text-slate-400">{formatMoney(m.purchasePrice)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <ScrollArea className="max-h-72 scroll-thin">
            {lines.length === 0 ? <div className="p-6 text-center text-sm text-slate-400">No medicines added yet</div> : (
              <Table>
                <TableHeader><TableRow className="bg-slate-50"><TableHead>Medicine</TableHead><TableHead>Batch #</TableHead><TableHead>Expiry</TableHead><TableHead className="w-20">Qty</TableHead><TableHead className="w-28">Purchase</TableHead><TableHead className="w-28">Selling</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {lines.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm font-medium">{l.name}</TableCell>
                      <TableCell><Input value={l.batchNumber} onChange={(e) => updateLine(idx, { batchNumber: e.target.value })} className="h-8 text-xs" /></TableCell>
                      <TableCell><Input type="date" value={l.expiryDate} onChange={(e) => updateLine(idx, { expiryDate: e.target.value })} className="h-8 text-xs w-36" /></TableCell>
                      <TableCell><Input type="number" value={l.unitQuantity} onChange={(e) => updateLine(idx, { unitQuantity: Number(e.target.value) })} className="h-8 text-xs w-16" /></TableCell>
                      <TableCell><Input type="number" step="0.01" value={l.purchasePrice} onChange={(e) => updateLine(idx, { purchasePrice: Number(e.target.value) })} className="h-8 text-xs w-24" /></TableCell>
                      <TableCell><Input type="number" step="0.01" value={l.sellingPrice} onChange={(e) => updateLine(idx, { sellingPrice: Number(e.target.value) })} className="h-8 text-xs w-24" /></TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatMoney(l.total)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(idx)}><X className="w-3.5 h-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>
        <div className="flex justify-end gap-6 mt-3">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{formatMoney(subTotal)}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-600">Discount</span><Input type="number" value={discountAmount || ''} onChange={(e) => setDiscountAmount(Number(e.target.value))} className="h-7 w-24 text-right text-xs" /></div>
            <div className="flex justify-between items-center"><span className="text-slate-600">VAT</span><Input type="number" value={vatAmount || ''} onChange={(e) => setVatAmount(Number(e.target.value))} className="h-7 w-24 text-right text-xs" /></div>
            <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-1"><span>Total</span><span className="text-primary">{formatMoney(totalAmount)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || lines.length === 0} className="bg-primary">{saving ? 'Saving...' : 'Save Purchase'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PurchaseDetailDialog({ purchase, onClose }: { purchase: any; onClose: () => void }) {
  const [details, setDetails] = useState<any>(null)
  useQuery({ queryKey: ['purchase', purchase.id], queryFn: async () => { const d = await (await fetch(`/api/purchases/${purchase.id}`)).json(); setDetails(d.item); return d } })
  const items = details?.items || purchase.items || []
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader><DialogTitle>Purchase {purchase.invoiceNumber}</DialogTitle></DialogHeader>
        <div className="print-area">
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div><span className="text-xs text-slate-400">Supplier</span><p className="font-medium">{purchase.supplierName}</p></div>
            <div><span className="text-xs text-slate-400">Date</span><p className="font-medium">{formatDate(purchase.purchaseDate)}</p></div>
            <div><span className="text-xs text-slate-400">Payment</span><p className="font-medium">{purchase.paymentMethod}</p></div>
            <div><span className="text-xs text-slate-400">Created By</span><p className="font-medium">{purchase.createdBy?.name || '-'}</p></div>
          </div>
          <Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead>Medicine</TableHead><TableHead>Batch</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((it: any) => (
                <TableRow key={it.id}><TableCell className="text-sm font-medium">{it.name}</TableCell><TableCell className="text-xs font-mono">{it.batchNumber}</TableCell><TableCell className="text-center text-sm">{it.unitQuantity}</TableCell><TableCell className="text-right text-sm">{formatMoney(it.purchasePrice)}</TableCell><TableCell className="text-right text-sm font-medium">{formatMoney(it.total)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-3"><div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{formatMoney(purchase.subTotal)}</span></div>
            {purchase.discountAmount > 0 && <div className="flex justify-between"><span className="text-slate-600">Discount</span><span>-{formatMoney(purchase.discountAmount)}</span></div>}
            {purchase.vatAmount > 0 && <div className="flex justify-between"><span className="text-slate-600">VAT</span><span>{formatMoney(purchase.vatAmount)}</span></div>}
            <div className="flex justify-between font-bold border-t border-slate-200 pt-1"><span>Total</span><span className="text-primary">{formatMoney(purchase.totalAmount)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{formatMoney(purchase.paidAmount)}</span></div>
            {purchase.dueAmount > 0 && <div className="flex justify-between text-red-600"><span>Due</span><span>{formatMoney(purchase.dueAmount)}</span></div>}
          </div></div>
        </div>
        <DialogFooter className="no-print"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => window.print()} className="bg-primary">Print</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
