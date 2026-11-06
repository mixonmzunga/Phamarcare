'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { formatMoney, formatDate } from '@/lib/format'
import { Plus, Search, Edit, Trash2, Eye, Building2, Wallet, Truck } from 'lucide-react'

const PAYMENT_METHODS = [{ value: 'CASH', label: 'Cash' }, { value: 'BANK', label: 'Bank' }, { value: 'AIRTEL_MONEY', label: 'Airtel Money' }, { value: 'TNM_MPAMBA', label: 'TNM Mpamba' }]

export function SuppliersModule() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [viewing, setViewing] = useState<any>(null)
  const [paying, setPaying] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [tab, setTab] = useState('suppliers')

  const { data, isLoading } = useQuery({ queryKey: ['suppliers', search], queryFn: async () => (await fetch(`/api/suppliers${search ? `?q=${search}` : ''}`)).json() })
  const suppliers = (data?.items || []).filter((s: any) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search))

  const delMut = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: (d) => { toast.success(d.deactivated ? 'Supplier deactivated' : 'Supplier deleted'); qc.invalidateQueries({ queryKey: ['suppliers'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="Suppliers & Manufacturers" subtitle="Manage suppliers and manufacturers" actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Add Supplier</Button>} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100"><TabsTrigger value="suppliers"><Truck className="w-4 h-4 mr-1.5" /> Suppliers</TabsTrigger><TabsTrigger value="manufacturers"><Building2 className="w-4 h-4 mr-1.5" /> Manufacturers</TabsTrigger></TabsList>
        <TabsContent value="suppliers" className="mt-4">
          <Card className="border-slate-200 shadow-sm p-4 mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div></Card>
          <Card className="border-slate-200 shadow-sm">
            {isLoading ? <div className="p-4"><LoadingState /></div> : suppliers.length === 0 ? <EmptyState title="No suppliers" icon={Truck} /> : (
              <div className="overflow-x-auto scroll-thin"><div className="min-w-[640px]"><Table>
                <TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Credit Limit</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {suppliers.map((s: any) => (
                    <TableRow key={s.id} className="hover:bg-slate-50">
                      <TableCell><div className="font-medium text-slate-800">{s.name}</div>{s.address && <div className="text-xs text-slate-400">{s.address}</div>}</TableCell>
                      <TableCell className="text-sm text-slate-600">{s.contactPerson || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{s.phone || '-'}</TableCell>
                      <TableCell className="text-right text-sm">{s.creditLimit > 0 ? formatMoney(s.creditLimit) : '-'}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewing(s)} title="Statement"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setPaying(s)} title="Make Payment" className="text-emerald-600"><Wallet className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div></div>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="manufacturers" className="mt-4"><ManufacturerTab /></TabsContent>
      </Tabs>
      {dialogOpen && <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />}
      {viewing && <SupplierStatementDialog supplier={viewing} onClose={() => setViewing(null)} />}
      {paying && <PaymentDialog supplier={paying} onClose={() => setPaying(null)} />}
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Delete Supplier" description="Delete this supplier? They will be deactivated if they have purchases." confirmText="Delete" destructive onConfirm={() => { if (deleteId) delMut.mutate(deleteId); setDeleteId(null) }} />
    </div>
  )
}

function SupplierDialog({ open, onOpenChange, editing }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(editing || { name: '', contactPerson: '', phone: '', email: '', address: '', openingBalance: 0, creditLimit: 0, paymentDeadline: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      const url = editing ? `/api/suppliers/${editing.id}` : '/api/suppliers'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(editing ? 'Supplier updated' : 'Supplier added')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      onOpenChange(false)
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3 py-2">
        <Field label="Company Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Contact Person"><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Credit Limit"><Input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} /></Field>
        <Field label="Payment Deadline"><Input type="date" value={form.paymentDeadline} onChange={(e) => setForm({ ...form, paymentDeadline: e.target.value })} /></Field>
        <div className="col-span-2"><Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></Field></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.name} className="bg-primary">{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function SupplierStatementDialog({ supplier, onClose }: any) {
  const { data, isLoading } = useQuery({ queryKey: ['supplier-statement', supplier.id], queryFn: async () => (await fetch(`/api/suppliers/${supplier.id}/statement`)).json() })
  const s = data?.supplier
  const purchases = s?.purchases || []
  const payments = s?.payments || []
  const totalDue = purchases.filter((p: any) => p.status === 'COMPLETED').reduce((sum: number, x: any) => sum + x.dueAmount, 0)
  const totalPaid = payments.reduce((sum: number, x: any) => sum + x.amount, 0)
  const sortedLines = [
    ...purchases.map((p: any) => ({ date: p.createdAt, desc: `Purchase ${p.invoiceNumber}`, debit: p.totalAmount, credit: p.paidAmount })),
    ...payments.map((p: any) => ({ date: p.createdAt, desc: `Payment ${p.voucherNumber}`, debit: 0, credit: p.amount })),
  ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const opening = supplier.openingBalance || 0
  const linesWithBalance = sortedLines.reduce((acc: any[], l: any) => {
    const prev = acc.length ? acc[acc.length - 1].balance : opening
    return [...acc, { ...l, balance: prev + l.debit - l.credit }]
  }, [])
  return (
    <Dialog open onOpenChange={onClose}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
      <DialogHeader><DialogTitle>Supplier Statement - {supplier.name}</DialogTitle></DialogHeader>
      {isLoading ? <LoadingState /> : (<>
        <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-400">Total Purchases</p><p className="font-bold">{formatMoney(purchases.reduce((sum: number, x: any) => sum + x.totalAmount, 0))}</p></div>
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-400">Total Paid</p><p className="font-bold text-emerald-600">{formatMoney(totalPaid)}</p></div>
          <div className="p-3 bg-red-50 rounded-lg"><p className="text-xs text-slate-400">Outstanding</p><p className="font-bold text-red-600">{formatMoney(totalDue)}</p></div>
        </div>
        <ScrollArea className="max-h-96 scroll-thin"><Table>
          <TableHeader><TableRow className="bg-slate-50"><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
          <TableBody>
            {linesWithBalance.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-6">No transactions</TableCell></TableRow>}
            {linesWithBalance.map((l: any, i: number) => <TableRow key={i}><TableCell className="text-xs">{formatDate(l.date)}</TableCell><TableCell className="text-sm">{l.desc}</TableCell><TableCell className="text-right text-sm">{l.debit > 0 ? formatMoney(l.debit) : '-'}</TableCell><TableCell className="text-right text-sm text-emerald-600">{l.credit > 0 ? formatMoney(l.credit) : '-'}</TableCell><TableCell className="text-right text-sm font-medium">{formatMoney(l.balance)}</TableCell></TableRow>)}
          </TableBody>
        </Table></ScrollArea>
      </>)}
      <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => window.print()} className="bg-primary">Print</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function PaymentDialog({ supplier, onClose }: any) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('CASH')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, paymentMethod: method, note }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Payment made to supplier')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open onOpenChange={onClose}><DialogContent>
      <DialogHeader><DialogTitle>Pay Supplier - {supplier.name}</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <Field label="Amount"><Input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        <Field label="Payment Method"><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving || amount <= 0} className="bg-primary">{saving ? 'Saving...' : 'Make Payment'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function ManufacturerTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['manufacturers'], queryFn: async () => (await fetch('/api/manufacturers')).json() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', contact: '', phone: '', email: '', address: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const saveMut = useMutation({
    mutationFn: async (data: any) => { const url = editing ? `/api/manufacturers/${editing.id}` : '/api/manufacturers'; const method = editing ? 'PUT' : 'POST'; const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['manufacturers'] }); setOpen(false) }, onError: (e: any) => toast.error(e.message),
  })
  const delMut = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/manufacturers/${id}`, { method: 'DELETE' }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['manufacturers'] }) }, onError: (e: any) => toast.error(e.message),
  })
  const items = data?.items || []
  return (
    <Card className="border-slate-200 shadow-sm">
      <div className="p-4 flex justify-between items-center border-b border-slate-100"><h3 className="font-semibold text-slate-700">Manufacturers ({items.length})</h3><Button onClick={() => { setEditing(null); setForm({ name: '', contact: '', phone: '', email: '', address: '' }); setOpen(true) }} size="sm" className="bg-primary"><Plus className="w-4 h-4 mr-1" /> Add</Button></div>
      {isLoading ? <LoadingState /> : items.length === 0 ? <EmptyState title="No manufacturers" /> : (
        <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((m: any) => (<TableRow key={m.id}><TableCell className="font-medium">{m.name}</TableCell><TableCell className="text-sm text-slate-600">{m.contact || '-'}</TableCell><TableCell className="text-sm text-slate-600">{m.phone || '-'}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditing(m); setForm({ name: m.name, contact: m.contact || '', phone: m.phone || '', email: m.email || '', address: m.address || '' }); setOpen(true) }}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button></TableCell></TableRow>))}</TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit Manufacturer' : 'Add Manufacturer'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Field label="Company Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Contact Person"><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div className="col-span-2"><Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></Field></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={!form.name} className="bg-primary">Save</Button></DialogFooter>
      </DialogContent></Dialog>
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Delete Manufacturer" description="Are you sure?" confirmText="Delete" destructive onConfirm={() => { if (deleteId) delMut.mutate(deleteId); setDeleteId(null) }} />
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
