'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { formatMoney, formatDate } from '@/lib/format'
import { Plus, Search, Edit, Trash2, Eye, Users, Wallet } from 'lucide-react'

const PAYMENT_METHODS = [{ value: 'CASH', label: 'Cash' }, { value: 'AIRTEL_MONEY', label: 'Airtel Money' }, { value: 'TNM_MPAMBA', label: 'TNM Mpamba' }, { value: 'BANK', label: 'Bank' }]

export function CustomersModule() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [viewing, setViewing] = useState<any>(null)
  const [paying, setPaying] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (search) p.set('q', search)
      const res = await fetch(`/api/customers?${p}`)
      return res.json()
    },
  })
  const customers = (data?.items || []).filter((c: any) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))

  const delMut = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: (d) => { toast.success(d.deactivated ? 'Customer deactivated' : 'Customer deleted'); qc.invalidateQueries({ queryKey: ['customers'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} customer(s)`} actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Add Customer</Button>} />
      <Card className="border-slate-200 shadow-sm p-4 mb-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
      </Card>
      <Card className="border-slate-200 shadow-sm">
        {isLoading ? <div className="p-4"><LoadingState /></div> : customers.length === 0 ? <EmptyState title="No customers" icon={Users} /> : (
          <div className="overflow-x-auto scroll-thin">
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Credit Limit</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {customers.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-slate-50">
                    <TableCell><div className="font-medium text-slate-800">{c.name}</div>{c.address && <div className="text-xs text-slate-400">{c.address}</div>}</TableCell>
                    <TableCell className="text-sm text-slate-600">{c.phone || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{c.email || '-'}</TableCell>
                    <TableCell className="text-right text-sm">{c.creditLimit > 0 ? formatMoney(c.creditLimit) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewing(c)} title="Statement"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setPaying(c)} title="Receive Payment" className="text-emerald-600"><Wallet className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button>
                        {c.phone !== '0000' && <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      {dialogOpen && <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />}
      {viewing && <StatementDialog customer={viewing} onClose={() => setViewing(null)} />}
      {paying && <PaymentDialog customer={paying} onClose={() => setPaying(null)} />}
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Delete Customer" description="Delete this customer? They will be deactivated if they have transactions." confirmText="Delete" destructive onConfirm={() => { if (deleteId) delMut.mutate(deleteId); setDeleteId(null) }} />
    </div>
  )
}

function CustomerDialog({ open, onOpenChange, editing }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(editing || { name: '', phone: '', email: '', address: '', openingBalance: 0, creditLimit: 0, paymentDeadline: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      const url = editing ? `/api/customers/${editing.id}` : '/api/customers'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(editing ? 'Customer updated' : 'Customer added')
      qc.invalidateQueries({ queryKey: ['customers'] })
      onOpenChange(false)
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Field label="Full Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Credit Limit"><Input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} /></Field>
          <Field label="Opening Balance"><Input type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })} /></Field>
          <Field label="Payment Deadline"><Input type="date" value={form.paymentDeadline} onChange={(e) => setForm({ ...form, paymentDeadline: e.target.value })} /></Field>
          <div className="col-span-2"><Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></Field></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.name} className="bg-primary">{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatementDialog({ customer, onClose }: any) {
  const { data, isLoading } = useQuery({ queryKey: ['customer-statement', customer.id], queryFn: async () => (await fetch(`/api/customers/${customer.id}/statement`)).json() })
  const c = data?.customer
  const sales = c?.sales || []
  const payments = c?.payments || []
  const totalDue = sales.filter((s: any) => s.status === 'COMPLETED' || s.status === 'PARTIAL_RETURN').reduce((s: number, x: any) => s + x.dueAmount, 0)
  const totalPaid = payments.reduce((s: number, x: any) => s + x.amount, 0)
  const sortedLines = [
    ...sales.map((s: any) => ({ date: s.createdAt, desc: `Sale ${s.invoiceNumber}`, debit: s.totalAmount, credit: s.paidAmount, type: 'sale' })),
    ...payments.map((p: any) => ({ date: p.createdAt, desc: `Payment ${p.receiptNumber}`, debit: 0, credit: p.amount, type: 'payment' })),
  ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const opening = customer.openingBalance || 0
  const linesWithBalance = sortedLines.reduce((acc: any[], l: any) => {
    const prev = acc.length ? acc[acc.length - 1].balance : opening
    return [...acc, { ...l, balance: prev + l.debit - l.credit }]
  }, [])
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader><DialogTitle>Customer Statement - {customer.name}</DialogTitle></DialogHeader>
        {isLoading ? <LoadingState /> : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-400">Total Sales</p><p className="font-bold">{formatMoney(sales.reduce((s: number, x: any) => s + x.totalAmount, 0))}</p></div>
              <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-400">Total Paid</p><p className="font-bold text-emerald-600">{formatMoney(totalPaid)}</p></div>
              <div className="p-3 bg-red-50 rounded-lg"><p className="text-xs text-slate-400">Outstanding</p><p className="font-bold text-red-600">{formatMoney(totalDue)}</p></div>
            </div>
            <ScrollArea className="max-h-96 scroll-thin">
              <Table>
                <TableHeader><TableRow className="bg-slate-50"><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {linesWithBalance.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-6">No transactions</TableCell></TableRow>}
                  {linesWithBalance.map((l: any, i: number) => (
                    <TableRow key={i}><TableCell className="text-xs">{formatDate(l.date)}</TableCell><TableCell className="text-sm">{l.desc}</TableCell><TableCell className="text-right text-sm">{l.debit > 0 ? formatMoney(l.debit) : '-'}</TableCell><TableCell className="text-right text-sm text-emerald-600">{l.credit > 0 ? formatMoney(l.credit) : '-'}</TableCell><TableCell className="text-right text-sm font-medium">{formatMoney(l.balance)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => window.print()} className="bg-primary">Print</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PaymentDialog({ customer, onClose }: any) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('CASH')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/customers/${customer.id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, paymentMethod: method, note }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Payment received')
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Receive Payment - {customer.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Amount"><Input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          <Field label="Payment Method"><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving || amount <= 0} className="bg-primary">{saving ? 'Saving...' : 'Receive Payment'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
