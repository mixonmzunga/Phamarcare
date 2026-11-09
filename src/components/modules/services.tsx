'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, ConfirmDialog, StatCard } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { formatMoney, formatDateTime } from '@/lib/format'
import { Plus, Edit, Stethoscope, Activity, DollarSign } from 'lucide-react'

const PAYMENT_METHODS = [{ value: 'CASH', label: 'Cash' }, { value: 'BANK', label: 'Bank' }, { value: 'AIRTEL_MONEY', label: 'Airtel Money' }, { value: 'CREDIT', label: 'Credit' }]

export function ServicesModule() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('services')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['services'], queryFn: async () => (await fetch('/api/services')).json() })
  const { data: invData } = useQuery({ queryKey: ['service-invoices'], queryFn: async () => (await fetch('/api/service-invoices')).json() })
  const { data: custData } = useQuery({ queryKey: ['customers'], queryFn: async () => (await fetch('/api/customers')).json() })
  const services = (data?.items || []).filter((s: any) => s.isActive)
  const invoices = invData?.items || []

  const delMut = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/services/${id}`, { method: 'DELETE' }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Service deactivated'); qc.invalidateQueries({ queryKey: ['services'] }); setDeleteId(null) }, onError: (e: any) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="Services Management" subtitle="Pharmacy services & service invoices" actions={<Button onClick={() => setInvoiceOpen(true)} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> New Service Invoice</Button>} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard title="Active Services" value={services.length} icon={Stethoscope} color="primary" />
        <StatCard title="Total Invoices" value={invoices.length} icon={Activity} color="info" />
        <StatCard title="Revenue" value={formatMoney(invoices.reduce((s: number, x: any) => s + x.totalAmount, 0))} icon={DollarSign} color="success" />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100"><TabsTrigger value="services">Services</TabsTrigger><TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger></TabsList>
        <TabsContent value="services" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            <div className="p-4 flex justify-between items-center border-b border-slate-100"><h3 className="font-semibold text-slate-700">Services</h3><Button onClick={() => { setEditing(null); setDialogOpen(true) }} size="sm" className="bg-primary"><Plus className="w-4 h-4 mr-1" /> Add Service</Button></div>
            {isLoading ? <LoadingState /> : services.length === 0 ? <EmptyState title="No services" icon={Stethoscope} /> : (
              <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Service</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Charge</TableHead><TableHead className="text-center">VAT</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>{services.map((s: any) => (<TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell className="text-sm text-slate-600">{s.description || '-'}</TableCell><TableCell className="text-right font-medium">{formatMoney(s.charge)}</TableCell><TableCell className="text-center text-sm">{s.vatPercent}%</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditing(s); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)} className="text-destructive"><Edit className="w-4 h-4" /></Button></TableCell></TableRow>))}</TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            {invoices.length === 0 ? <EmptyState title="No service invoices" /> : (
              <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Service</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>{invoices.map((i: any) => (<TableRow key={i.id}><TableCell className="font-medium">{i.invoiceNumber}</TableCell><TableCell className="text-sm text-slate-600">{i.customerName}</TableCell><TableCell className="text-sm text-slate-600">{i.serviceName}</TableCell><TableCell className="text-right font-medium">{formatMoney(i.totalAmount)}</TableCell><TableCell className="text-sm text-slate-500">{formatDateTime(i.createdAt)}</TableCell></TableRow>))}</TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      {dialogOpen && <ServiceDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />}
      {invoiceOpen && <ServiceInvoiceDialog services={services} customers={custData?.items} onClose={() => setInvoiceOpen(false)} />}
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Deactivate Service" description="Deactivate this service?" confirmText="Deactivate" onConfirm={() => { if (deleteId) delMut.mutate(deleteId) }} />
    </div>
  )
}

function ServiceDialog({ open, onOpenChange, editing }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(editing || { name: '', description: '', charge: 0, vatPercent: 0, isActive: true })
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      const url = editing ? `/api/services/${editing.id}` : '/api/services'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Saved'); qc.invalidateQueries({ queryKey: ['services'] }); onOpenChange(false)
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
      <DialogHeader><DialogTitle>{editing ? 'Edit Service' : 'Add Service'}</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <Field label="Service Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Charge"><Input type="number" value={form.charge} onChange={(e) => setForm({ ...form, charge: Number(e.target.value) })} /></Field>
          <Field label="VAT %"><Input type="number" value={form.vatPercent} onChange={(e) => setForm({ ...form, vatPercent: Number(e.target.value) })} /></Field>
        </div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.name} className="bg-primary">{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function ServiceInvoiceDialog({ services, customers, onClose }: any) {
  const qc = useQueryClient()
  const [serviceId, setServiceId] = useState('')
  const [customerId, setCustomerId] = useState('walkin')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [saving, setSaving] = useState(false)
  const service = services?.find((s: any) => s.id === serviceId)
  const customerName = customerId === 'walkin' ? 'Walk-in' : customers?.find((c: any) => c.id === customerId)?.name || 'Walk-in'
  const total = service ? service.charge * (1 + service.vatPercent / 100) : 0
  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/service-invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceId, customerId: customerId === 'walkin' ? null : customerId, customerName, paymentMethod }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Service invoice created'); qc.invalidateQueries({ queryKey: ['service-invoices'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open onOpenChange={onClose}><DialogContent>
      <DialogHeader><DialogTitle>New Service Invoice</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <Field label="Service"><Select value={serviceId} onValueChange={setServiceId}><SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger><SelectContent>{services?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} - {formatMoney(s.charge)}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Customer"><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="walkin">Walk-in Customer</SelectItem>{customers?.filter((c: any) => c.phone !== '0000').map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Payment Method"><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></Field>
        {service && <div className="p-3 bg-slate-50 rounded-lg flex justify-between text-sm font-bold"><span>Total (incl. VAT)</span><span className="text-primary">{formatMoney(total)}</span></div>}
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving || !serviceId} className="bg-primary">{saving ? 'Saving...' : 'Create Invoice'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
