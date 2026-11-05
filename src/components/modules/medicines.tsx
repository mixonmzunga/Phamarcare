'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, ConfirmDialog, BadgeStatus } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useNav } from '@/lib/store'
import { formatMoney } from '@/lib/format'
import { Plus, Search, Edit, Trash2, Eye, Pill, Barcode as BarcodeIcon, Tag, Layers } from 'lucide-react'

interface Medicine { id: string; name: string; genericName?: string|null; barcode?: string|null; productCode?: string|null; categoryId?: string|null; typeId?: string|null; manufacturerId?: string|null; unitId?: string|null; purchasePrice: number; sellingPrice: number; discountPercent: number; vatPercent: number; minStockLevel: number; boxQuantity: number; stripsPerBox: number; tabletsPerStrip: number; description?: string|null; prescription: boolean; isActive: boolean; category?: any; type?: any; manufacturer?: any; unit?: any; totalStock?: number }

export function MedicinesModule() {
  const { params, setView } = useNav()
  const qc = useQueryClient()
  const [search, setSearch] = useState(params.search || '')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [typeId, setTypeId] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Medicine | null>(null)
  const [viewing, setViewing] = useState<Medicine | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('medicines')

  const { data, isLoading } = useQuery({
    queryKey: ['medicines', search, categoryId, typeId, showInactive],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (search) p.set('q', search)
      if (categoryId !== 'all') p.set('categoryId', categoryId)
      if (typeId !== 'all') p.set('typeId', typeId)
      if (showInactive) p.set('all', '1')
      const res = await fetch(`/api/medicines?${p}`)
      return res.json()
    },
  })
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: async () => (await fetch('/api/categories')).json() })
  const { data: types } = useQuery({ queryKey: ['types'], queryFn: async () => (await fetch('/api/types')).json() })
  const { data: manuf } = useQuery({ queryKey: ['manufacturers'], queryFn: async () => (await fetch('/api/manufacturers')).json() })
  const { data: units } = useQuery({ queryKey: ['units'], queryFn: async () => (await fetch('/api/units')).json() })

  const medicines = data?.items || []

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/medicines/${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: (d) => { toast.success(d.deactivated ? 'Medicine deactivated (has transaction history)' : 'Medicine deleted'); qc.invalidateQueries({ queryKey: ['medicines'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader
        title="Medicine Management"
        subtitle={`${medicines.length} medicine(s) in catalog`}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Add Medicine</Button>}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="medicines"><Pill className="w-4 h-4 mr-1.5" /> Medicines</TabsTrigger>
          <TabsTrigger value="categories"><Layers className="w-4 h-4 mr-1.5" /> Categories</TabsTrigger>
          <TabsTrigger value="types"><Tag className="w-4 h-4 mr-1.5" /> Types</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="manufacturers">Manufacturers</TabsTrigger>
        </TabsList>

        <TabsContent value="medicines" className="mt-4">
          <Card className="border-slate-200 shadow-sm p-4 mb-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search by name, generic, barcode, product code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Categories</SelectItem>{cats?.items?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Types</SelectItem>{types?.items?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Show inactive
              </label>
            </div>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            {isLoading ? <div className="p-4"><LoadingState /></div> : medicines.length === 0 ? (
              <EmptyState title="No medicines found" description="Add your first medicine to get started" action={<Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Add Medicine</Button>} />
            ) : (
              <div className="overflow-x-auto scroll-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Medicine</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead className="text-right">Purchase</TableHead>
                      <TableHead className="text-right">Selling</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicines.map((m: Medicine) => (
                      <TableRow key={m.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="font-medium text-slate-800">{m.name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            {m.genericName && <span>{m.genericName}</span>}
                            {m.barcode && <span className="flex items-center gap-0.5"><BarcodeIcon className="w-3 h-3" />{m.barcode}</span>}
                            {m.prescription && <Badge variant="secondary" className="text-[10px] h-4">Rx</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{m.category?.name || '-'}</TableCell>
                        <TableCell className="text-sm text-slate-600">{m.manufacturer?.name || '-'}</TableCell>
                        <TableCell className="text-right text-sm">{formatMoney(m.purchasePrice)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatMoney(m.sellingPrice)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={(m.totalStock ?? 0) <= m.minStockLevel ? 'destructive' : 'secondary'}>{m.totalStock ?? 0}</Badge>
                        </TableCell>
                        <TableCell className="text-center"><BadgeStatus status={m.isActive ? 'ACTIVE' : 'INACTIVE'} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setViewing(m)}><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4"><SimpleMasterList model="categories" label="Category" field="name" hasDesc /></TabsContent>
        <TabsContent value="types" className="mt-4"><SimpleMasterList model="types" label="Type" field="name" /></TabsContent>
        <TabsContent value="units" className="mt-4"><SimpleMasterList model="units" label="Unit" field="name" /></TabsContent>
        <TabsContent value="manufacturers" className="mt-4"><ManufacturerList /></TabsContent>
      </Tabs>

      {dialogOpen && <MedicineDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} cats={cats?.items} types={types?.items} manuf={manuf?.items} units={units?.items} />}
      {viewing && <ViewDialog medicine={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); setDialogOpen(true) }} />}
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Delete Medicine" description="This medicine will be deleted. If it has transaction history it will be deactivated instead." confirmText="Delete" destructive onConfirm={() => { if (deleteId) deleteMut.mutate(deleteId); setDeleteId(null) }} />
    </div>
  )
}

function MedicineDialog({ open, onOpenChange, editing, cats, types, manuf, units }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(editing || { name: '', genericName: '', categoryId: '', typeId: '', manufacturerId: '', unitId: '', barcode: '', productCode: '', purchasePrice: 0, sellingPrice: 0, discountPercent: 0, vatPercent: 0, minStockLevel: 10, boxQuantity: 1, stripsPerBox: 0, tabletsPerStrip: 0, description: '', prescription: false, isActive: true })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const url = editing ? `/api/medicines/${editing.id}` : '/api/medicines'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(editing ? 'Medicine updated' : 'Medicine added')
      qc.invalidateQueries({ queryKey: ['medicines'] })
      onOpenChange(false)
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader><DialogTitle>{editing ? 'Edit Medicine' : 'Add Medicine'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <Field label="Brand Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Generic Name"><Input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} /></Field>
          <Field label="Category"><Select value={form.categoryId || 'none'} onValueChange={(v) => setForm({ ...form, categoryId: v === 'none' ? null : v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{cats?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Medicine Type"><Select value={form.typeId || 'none'} onValueChange={(v) => setForm({ ...form, typeId: v === 'none' ? null : v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{types?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Manufacturer"><Select value={form.manufacturerId || 'none'} onValueChange={(v) => setForm({ ...form, manufacturerId: v === 'none' ? null : v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{manuf?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Unit"><Select value={form.unitId || 'none'} onValueChange={(v) => setForm({ ...form, unitId: v === 'none' ? null : v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{units?.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Barcode"><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></Field>
          <Field label="Product Code"><Input value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} placeholder="Auto-generated if empty" /></Field>
          <Field label="Purchase Price"><Input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} /></Field>
          <Field label="Selling Price"><Input type="number" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} /></Field>
          <Field label="Discount %"><Input type="number" step="0.01" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} /></Field>
          <Field label="VAT %"><Input type="number" step="0.01" value={form.vatPercent} onChange={(e) => setForm({ ...form, vatPercent: Number(e.target.value) })} /></Field>
          <Field label="Min Stock Level"><Input type="number" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: Number(e.target.value) })} /></Field>
          <Field label="Box Quantity"><Input type="number" value={form.boxQuantity} onChange={(e) => setForm({ ...form, boxQuantity: Number(e.target.value) })} /></Field>
          <Field label="Strips per Box"><Input type="number" value={form.stripsPerBox} onChange={(e) => setForm({ ...form, stripsPerBox: Number(e.target.value) })} /></Field>
          <Field label="Tablets per Strip"><Input type="number" value={form.tabletsPerStrip} onChange={(e) => setForm({ ...form, tabletsPerStrip: Number(e.target.value) })} /></Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field></div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.prescription} onCheckedChange={(v) => setForm({ ...form, prescription: v })} /> Prescription Required</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /> Active</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name} className="bg-primary">{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ViewDialog({ medicine, onClose, onEdit }: any) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{medicine.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Generic Name" value={medicine.genericName} />
          <Info label="Category" value={medicine.category?.name} />
          <Info label="Type" value={medicine.type?.name} />
          <Info label="Manufacturer" value={medicine.manufacturer?.name} />
          <Info label="Unit" value={medicine.unit?.name} />
          <Info label="Barcode" value={medicine.barcode} />
          <Info label="Product Code" value={medicine.productCode} />
          <Info label="Purchase Price" value={formatMoney(medicine.purchasePrice)} />
          <Info label="Selling Price" value={formatMoney(medicine.sellingPrice)} />
          <Info label="Min Stock" value={String(medicine.minStockLevel)} />
          <Info label="Current Stock" value={String(medicine.totalStock ?? 0)} />
          <Info label="Prescription" value={medicine.prescription ? 'Yes' : 'No'} />
        </div>
        {medicine.description && <div className="text-sm text-slate-600 mt-2"><span className="font-medium">Description: </span>{medicine.description}</div>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onEdit} className="bg-primary"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SimpleMasterList({ model, label, field, hasDesc }: { model: string; label: string; field: string; hasDesc?: boolean }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: [model], queryFn: async () => (await fetch(`/api/${model}`)).json() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', description: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const saveMut = useMutation({
    mutationFn: async (data: any) => {
      const url = editing ? `/api/${model}/${editing.id}` : `/api/${model}`
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: [model] }); setOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })
  const delMut = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/${model}/${id}`, { method: 'DELETE' }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: [model] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const items = data?.items || []
  return (
    <Card className="border-slate-200 shadow-sm">
      <div className="p-4 flex justify-between items-center border-b border-slate-100">
        <h3 className="font-semibold text-slate-700">{label}s ({items.length})</h3>
        <Button onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true) }} size="sm" className="bg-primary"><Plus className="w-4 h-4 mr-1" /> Add {label}</Button>
      </div>
      {isLoading ? <LoadingState /> : items.length === 0 ? <EmptyState title={`No ${label.toLowerCase()}s`} /> : (
        <Table>
          <TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead>{hasDesc && <TableHead>Description</TableHead>}<TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((it: any) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">{it.name}</TableCell>
                {hasDesc && <TableCell className="text-sm text-slate-500">{it.description || '-'}</TableCell>}
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(it); setForm({ name: it.name, description: it.description || '' }); setOpen(true) }}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(it.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? `Edit ${label}` : `Add ${label}`}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            {hasDesc && <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={!form.name} className="bg-primary">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title={`Delete ${label}`} description="Are you sure?" confirmText="Delete" destructive onConfirm={() => { if (deleteId) delMut.mutate(deleteId); setDeleteId(null) }} />
    </Card>
  )
}

function ManufacturerList() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['manufacturers'], queryFn: async () => (await fetch('/api/manufacturers')).json() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ name: '', contact: '', phone: '', email: '', address: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const saveMut = useMutation({
    mutationFn: async (data: any) => { const url = editing ? `/api/manufacturers/${editing.id}` : '/api/manufacturers'; const method = editing ? 'PUT' : 'POST'; const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['manufacturers'] }); setOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })
  const delMut = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/manufacturers/${id}`, { method: 'DELETE' }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['manufacturers'] }) },
    onError: (e: any) => toast.error(e.message),
  })
  const items = data?.items || []
  return (
    <Card className="border-slate-200 shadow-sm">
      <div className="p-4 flex justify-between items-center border-b border-slate-100">
        <h3 className="font-semibold text-slate-700">Manufacturers ({items.length})</h3>
        <Button onClick={() => { setEditing(null); setForm({ name: '', contact: '', phone: '', email: '', address: '' }); setOpen(true) }} size="sm" className="bg-primary"><Plus className="w-4 h-4 mr-1" /> Add Manufacturer</Button>
      </div>
      {isLoading ? <LoadingState /> : items.length === 0 ? <EmptyState title="No manufacturers" /> : (
        <Table>
          <TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-sm text-slate-600">{m.contact || '-'}</TableCell>
                <TableCell className="text-sm text-slate-600">{m.phone || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setForm({ name: m.name, contact: m.contact || '', phone: m.phone || '', email: m.email || '', address: m.address || '' }); setOpen(true) }}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Manufacturer' : 'Add Manufacturer'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Field label="Company Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Contact Person"><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={!form.name} className="bg-primary">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Delete Manufacturer" description="Are you sure?" confirmText="Delete" destructive onConfirm={() => { if (deleteId) delMut.mutate(deleteId); setDeleteId(null) }} />
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><span className="text-xs text-slate-400">{label}</span><p className="font-medium text-slate-700">{value || '-'}</p></div>
}
