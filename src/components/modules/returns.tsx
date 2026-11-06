'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, BadgeStatus } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { formatMoney, formatDateTime } from '@/lib/format'
import { Undo2, Plus, Search, ArrowRightLeft } from 'lucide-react'

export function ReturnsModule() {
  const [tab, setTab] = useState('sale')
  const { data } = useQuery({ queryKey: ['returns', 'sale'], queryFn: async () => (await fetch('/api/returns?type=sale')).json() })
  const [newOpen, setNewOpen] = useState(false)
  const returns = data?.items || []

  return (
    <div>
      <PageHeader title="Returns Management" subtitle="Sales and purchase returns with stock control" actions={<Button onClick={() => setNewOpen(true)} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> New Sales Return</Button>} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100"><TabsTrigger value="sale"><Undo2 className="w-4 h-4 mr-1.5" /> Sales Returns ({returns.length})</TabsTrigger><TabsTrigger value="purchase"><ArrowRightLeft className="w-4 h-4 mr-1.5" /> Purchase Returns</TabsTrigger></TabsList>
        <TabsContent value="sale" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            {returns.length === 0 ? <EmptyState title="No sales returns" description="Process a return when a customer brings back medicine" icon={Undo2} /> : (
              <div className="overflow-x-auto scroll-thin"><div className="min-w-[640px]"><Table>
                <TableHeader><TableRow className="bg-slate-50"><TableHead>Return #</TableHead><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-center">Restock</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {returns.map((r: any) => (
                    <TableRow key={r.id}><TableCell className="font-mono text-xs">{r.returnNumber}</TableCell><TableCell className="text-sm">{r.sale?.invoiceNumber}</TableCell><TableCell className="text-sm text-slate-600">{r.customerName}</TableCell><TableCell className="text-right font-medium">{formatMoney(r.totalAmount)}</TableCell><TableCell className="text-center"><Badge variant={r.restock ? 'default' : 'secondary'}>{r.restock ? 'Yes' : 'No'}</Badge></TableCell><TableCell className="text-sm text-slate-600 max-w-xs truncate">{r.reason}</TableCell><TableCell className="text-sm text-slate-500">{formatDateTime(r.createdAt)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table></div></div>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="purchase" className="mt-4">
          <Card className="border-slate-200 shadow-sm"><EmptyState title="Purchase Returns" description="Purchase returns are processed from the purchase detail view" icon={ArrowRightLeft} /></Card>
        </TabsContent>
      </Tabs>
      {newOpen && <NewReturnDialog onClose={() => setNewOpen(false)} />}
    </div>
  )
}

function NewReturnDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [saleId, setSaleId] = useState('')
  const [reason, setReason] = useState('')
  const [restock, setRestock] = useState(true)
  const [returnQty, setReturnQty] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  const { data: saleData } = useQuery({ queryKey: ['sales-return', search], queryFn: async () => { if (!search) return { items: [] }; const res = await fetch(`/api/sales?q=${search}`); return res.json() }, enabled: !!search })
  const { data: detail } = useQuery({ queryKey: ['sale-detail', saleId], queryFn: async () => { const res = await fetch(`/api/sales/${saleId}`); return res.json() }, enabled: !!saleId })
  const sale = detail?.item

  async function save() {
    if (!sale) return
    const items = (sale.items || []).filter((it: any) => returnQty[it.id] > 0).map((it: any) => ({ medicineId: it.medicineId, batchId: it.batchId, name: it.name, quantity: returnQty[it.id], unitPrice: it.unitPrice, total: it.unitPrice * returnQty[it.id] }))
    if (items.length === 0) { toast.error('Select at least one item to return'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ saleId, items, reason, restock }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Return processed')
      qc.invalidateQueries({ queryKey: ['returns'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
      <DialogHeader><DialogTitle>New Sales Return</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search invoice number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
        {saleData?.items?.length > 0 && !sale && (
          <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto scroll-thin">
            {saleData.items.slice(0, 5).map((s: any) => <button key={s.id} onClick={() => setSaleId(s.id)} className="w-full text-left p-2 hover:bg-slate-50 text-sm border-b border-slate-100"><span className="font-medium">{s.invoiceNumber}</span> - {s.customerName} - {formatMoney(s.totalAmount)}</button>)}
          </div>
        )}
        {sale && (
          <>
            <div className="p-3 bg-slate-50 rounded-lg text-sm"><p className="font-medium">{sale.invoiceNumber}</p><p className="text-slate-500">{sale.customerName} · {formatDateTime(sale.createdAt)} · Total: {formatMoney(sale.totalAmount)}</p></div>
            <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Item</TableHead><TableHead className="text-center">Bought</TableHead><TableHead className="text-center">Return Qty</TableHead><TableHead className="text-right">Refund</TableHead></TableRow></TableHeader>
              <TableBody>{sale.items?.map((it: any) => (
                <TableRow key={it.id}><TableCell className="text-sm">{it.name}</TableCell><TableCell className="text-center text-sm">{it.quantity}</TableCell><TableCell className="text-center"><Input type="number" min={0} max={it.quantity} value={returnQty[it.id] || 0} onChange={(e) => setReturnQty({ ...returnQty, [it.id]: Math.min(it.quantity, Number(e.target.value)) })} className="h-8 w-20 text-center text-xs" /></TableCell><TableCell className="text-right text-sm">{returnQty[it.id] ? formatMoney(it.unitPrice * returnQty[it.id]) : '-'}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
            <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for return" /></Field>
            <label className="flex items-center gap-2 text-sm"><Switch checked={restock} onCheckedChange={setRestock} /> Restock returned items (only if saleable)</label>
          </>
        )}
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving || !sale || !reason} className="bg-primary">{saving ? 'Processing...' : 'Process Return'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
