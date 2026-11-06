'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, ConfirmDialog, StatCard } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { formatMoney, formatDate } from '@/lib/format'
import { Plus, Trash2, Wallet, TrendingDown, Receipt } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const PAYMENT_METHODS = [{ value: 'CASH', label: 'Cash' }, { value: 'BANK', label: 'Bank' }, { value: 'AIRTEL_MONEY', label: 'Airtel Money' }, { value: 'TNM_MPAMBA', label: 'TNM Mpamba' }]

export function ExpensesModule() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['expenses'], queryFn: async () => (await fetch('/api/expenses')).json() })
  const { data: catData } = useQuery({ queryKey: ['expense-categories'], queryFn: async () => (await fetch('/api/expense-categories')).json() })
  const expenses = data?.items || []
  const total = expenses.reduce((s: number, x: any) => s + x.amount, 0)
  const byCategory = expenses.reduce((acc: any, e: any) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc }, {})

  const delMut = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Expense deleted'); qc.invalidateQueries({ queryKey: ['expenses'] }); setDeleteId(null) }, onError: (e: any) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="Expense Management" subtitle={`${expenses.length} expense(s) · Total: ${formatMoney(total)}`} actions={<Button onClick={() => setDialogOpen(true)} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Add Expense</Button>} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard title="Total Expenses" value={formatMoney(total)} icon={Wallet} color="danger" />
        <StatCard title="This Month" value={formatMoney(expenses.filter((e: any) => new Date(e.date).getMonth() === new Date().getMonth()).reduce((s: number, e: any) => s + e.amount, 0))} icon={TrendingDown} color="warning" />
        <StatCard title="Categories" value={Object.keys(byCategory).length} icon={Receipt} color="info" />
      </div>
      <Card className="border-slate-200 shadow-sm">
        {isLoading ? <div className="p-4"><LoadingState /></div> : expenses.length === 0 ? <EmptyState title="No expenses" icon={Wallet} action={<Button onClick={() => setDialogOpen(true)} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Add Expense</Button>} /> : (
          <div className="overflow-x-auto scroll-thin"><div className="min-w-[640px]"><Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-center">Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Recorded By</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {expenses.map((e: any) => (
                <TableRow key={e.id} className="hover:bg-slate-50">
                  <TableCell className="text-sm text-slate-500">{formatDate(e.date)}</TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell className="text-sm text-slate-600">{e.description || '-'}</TableCell>
                  <TableCell className="text-center text-xs text-slate-500">{e.paymentMethod}</TableCell>
                  <TableCell className="text-right font-medium text-red-600">{formatMoney(e.amount)}</TableCell>
                  <TableCell className="text-sm text-slate-500">{e.createdBy?.name || '-'}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div></div>
        )}
      </Card>
      {dialogOpen && <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} categories={catData?.items} />}
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Delete Expense" description="Are you sure?" confirmText="Delete" destructive onConfirm={() => { if (deleteId) delMut.mutate(deleteId) }} />
    </div>
  )
}

function ExpenseDialog({ open, onOpenChange, categories }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>({ category: '', description: '', amount: 0, paymentMethod: 'CASH', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Expense recorded')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
      <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <Field label="Category"><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}<SelectItem value="Other">Other</SelectItem></SelectContent></Select></Field>
        <Field label="Amount"><Input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
        <Field label="Payment Method"><Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.amount || !form.category} className="bg-primary">{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
