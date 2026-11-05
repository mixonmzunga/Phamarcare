'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, StatCard, ConfirmDialog } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { formatMoney, formatDate, daysUntil } from '@/lib/format'
import { Search, AlertTriangle, CalendarClock, Boxes, Wrench, PackageCheck } from 'lucide-react'

export function InventoryModule() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [adjustBatch, setAdjustBatch] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('stock')

  const { data, isLoading } = useQuery({
    queryKey: ['batches', search, status],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (search) p.set('q', search)
      p.set('status', status)
      const res = await fetch(`/api/batches?${p}`)
      return res.json()
    },
  })
  const { data: alertData } = useQuery({
    queryKey: ['batches-alerts'],
    queryFn: async () => (await fetch('/api/batches?expiryAlert=1&status=all')).json(),
  })

  const batches = data?.items || []
  const alertBatches = (alertData?.items || []).filter((b: any) => !b.isExpired)
  const expiredBatches = (alertData?.items || []).filter((b: any) => b.isExpired)

  const stockValue = batches.reduce((s: number, b: any) => s + b.availableQty * b.purchasePrice, 0)
  const totalUnits = batches.reduce((s: number, b: any) => s + b.availableQty, 0)

  return (
    <div>
      <PageHeader title="Inventory / Stock" subtitle="Batch-wise stock tracking with FEFO, expiry & damage management" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Batches" value={batches.length} icon={Boxes} color="primary" />
        <StatCard title="Total Units" value={totalUnits} icon={PackageCheck} color="info" />
        <StatCard title="Stock Value" value={formatMoney(stockValue)} icon={Boxes} color="success" />
        <StatCard title="Expiring Soon" value={alertBatches.length} icon={AlertTriangle} color="warning" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="stock">Current Stock</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon ({alertBatches.length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({expiredBatches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4">
          <Card className="border-slate-200 shadow-sm p-4 mb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search by medicine name, barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            {isLoading ? <div className="p-4"><LoadingState /></div> : batches.length === 0 ? <EmptyState title="No batches found" /> : (
              <div className="overflow-x-auto scroll-thin">
                <Table>
                  <TableHeader><TableRow className="bg-slate-50">
                    <TableHead>Medicine</TableHead><TableHead>Batch #</TableHead><TableHead>Supplier</TableHead>
                    <TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Purchase</TableHead>
                    <TableHead>Expiry</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {batches.map((b: any) => (
                      <TableRow key={b.id} className="hover:bg-slate-50">
                        <TableCell><div className="font-medium text-slate-800">{b.medicine?.name}</div><div className="text-xs text-slate-400">{b.medicine?.productCode}</div></TableCell>
                        <TableCell className="text-sm font-mono">{b.batchNumber}</TableCell>
                        <TableCell className="text-sm text-slate-600">{b.supplier?.name || '-'}</TableCell>
                        <TableCell className="text-center"><Badge variant={b.availableQty === 0 ? 'destructive' : 'secondary'}>{b.availableQty}</Badge></TableCell>
                        <TableCell className="text-right text-sm">{formatMoney(b.purchasePrice)}</TableCell>
                        <TableCell><div className="text-sm">{formatDate(b.expiryDate)}</div><div className={`text-xs ${b.daysToExpiry < 0 ? 'text-red-600' : b.daysToExpiry <= 60 ? 'text-amber-600' : 'text-slate-400'}`}>{b.daysToExpiry < 0 ? 'Expired' : `${b.daysToExpiry} days left`}</div></TableCell>
                        <TableCell className="text-center">
                          <Badge variant={b.isExpired ? 'destructive' : b.daysToExpiry <= 60 ? 'default' : 'secondary'}>{b.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setAdjustBatch(b)} disabled={b.status !== 'ACTIVE'}><Wrench className="w-3.5 h-3.5 mr-1" /> Adjust</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            {alertBatches.length === 0 ? <EmptyState title="No medicines expiring soon" icon={AlertTriangle} /> : (
              <Table>
                <TableHeader><TableRow className="bg-slate-50"><TableHead>Medicine</TableHead><TableHead>Batch</TableHead><TableHead className="text-center">Qty</TableHead><TableHead>Expiry</TableHead><TableHead className="text-center">Days Left</TableHead></TableRow></TableHeader>
                <TableBody>
                  {alertBatches.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.medicine?.name}</TableCell>
                      <TableCell className="font-mono text-sm">{b.batchNumber}</TableCell>
                      <TableCell className="text-center">{b.availableQty}</TableCell>
                      <TableCell>{formatDate(b.expiryDate)}</TableCell>
                      <TableCell className="text-center"><Badge variant={b.daysToExpiry <= 30 ? 'destructive' : 'default'}>{b.daysToExpiry} days</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="expired" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            {expiredBatches.length === 0 ? <EmptyState title="No expired batches" icon={CalendarClock} /> : (
              <Table>
                <TableHeader><TableRow className="bg-slate-50"><TableHead>Medicine</TableHead><TableHead>Batch</TableHead><TableHead className="text-center">Qty</TableHead><TableHead>Expiry</TableHead></TableRow></TableHeader>
                <TableBody>
                  {expiredBatches.map((b: any) => (
                    <TableRow key={b.id} className="bg-red-50/50">
                      <TableCell className="font-medium">{b.medicine?.name}</TableCell>
                      <TableCell className="font-mono text-sm">{b.batchNumber}</TableCell>
                      <TableCell className="text-center">{b.availableQty}</TableCell>
                      <TableCell className="text-red-600">{formatDate(b.expiryDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {adjustBatch && <AdjustDialog batch={adjustBatch} onClose={() => setAdjustBatch(null)} />}
    </div>
  )
}

function AdjustDialog({ batch, onClose }: { batch: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [type, setType] = useState('ADD')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/stock-adjustments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineId: batch.medicineId, batchId: batch.id, type, quantity, reason }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Stock adjusted')
      qc.invalidateQueries({ queryKey: ['batches'] })
      qc.invalidateQueries({ queryKey: ['batches-alerts'] })
      onClose()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="font-medium">{batch.medicine?.name}</p>
            <p className="text-slate-500">Batch: {batch.batchNumber} · Current Qty: {batch.availableQty}</p>
          </div>
          <div><Label className="text-xs mb-1 block">Adjustment Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADD">Add Stock</SelectItem>
                <SelectItem value="REMOVE">Remove Stock</SelectItem>
                <SelectItem value="DAMAGE">Mark Damaged</SelectItem>
                <SelectItem value="EXPIRE">Mark Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs mb-1 block">Quantity</Label><Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></div>
          <div><Label className="text-xs mb-1 block">Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for adjustment" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving || !reason} className="bg-primary">{saving ? 'Saving...' : 'Apply Adjustment'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
