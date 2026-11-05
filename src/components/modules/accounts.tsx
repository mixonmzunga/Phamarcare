'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, StatCard } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { formatMoney, formatDate } from '@/lib/format'
import { Plus, Trash2, BookOpen, Scale, FileText, TrendingUp } from 'lucide-react'

const VOUCHER_TYPES = [{ value: 'JOURNAL', label: 'Journal Voucher' }, { value: 'DEBIT', label: 'Debit Voucher' }, { value: 'CREDIT', label: 'Credit Voucher' }, { value: 'CONTRA', label: 'Contra Voucher' }, { value: 'PAYMENT', label: 'Payment Voucher' }, { value: 'RECEIPT', label: 'Receipt Voucher' }]

export function AccountsModule() {
  const [tab, setTab] = useState('trial')
  const { data, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await fetch('/api/accounts')).json() })
  const accounts = data?.accounts || []
  const vouchers = data?.vouchers || []
  const trial = data?.trialBalance || []

  const totalDebit = trial.reduce((s: number, a: any) => s + (a.balance > 0 ? a.balance : 0), 0)
  const totalCredit = trial.reduce((s: number, a: any) => s + (a.balance < 0 ? -a.balance : 0), 0)
  const assets = trial.filter((a: any) => a.type === 'ASSET').reduce((s: number, a: any) => s + a.balance, 0)
  const liabilities = trial.filter((a: any) => a.type === 'LIABILITY').reduce((s: number, a: any) => s - a.balance, 0)
  const income = trial.filter((a: any) => a.type === 'INCOME').reduce((s: number, a: any) => s - a.balance, 0)
  const expenses = trial.filter((a: any) => a.type === 'EXPENSE').reduce((s: number, a: any) => s + a.balance, 0)

  return (
    <div>
      <PageHeader title="Accounts & Finance" subtitle="Double-entry accounting & financial reports" actions={<NewVoucherButton accounts={accounts} />} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Assets" value={formatMoney(assets)} icon={TrendingUp} color="primary" />
        <StatCard title="Total Liabilities" value={formatMoney(liabilities)} icon={Scale} color="danger" />
        <StatCard title="Total Income" value={formatMoney(income)} icon={FileText} color="success" />
        <StatCard title="Total Expenses" value={formatMoney(expenses)} icon={FileText} color="warning" />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100"><TabsTrigger value="trial">Trial Balance</TabsTrigger><TabsTrigger value="vouchers">Vouchers ({vouchers.length})</TabsTrigger><TabsTrigger value="accounts">Chart of Accounts</TabsTrigger></TabsList>
        <TabsContent value="trial" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            {isLoading ? <LoadingState /> : trial.length === 0 ? <EmptyState title="No transactions yet" /> : (
              <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead className="text-center">Type</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                <TableBody>{trial.map((a: any) => (
                  <TableRow key={a.id}><TableCell className="font-mono text-xs">{a.code}</TableCell><TableCell className="font-medium">{a.name}</TableCell><TableCell className="text-center text-xs"><span className="text-slate-500">{a.type}</span></TableCell><TableCell className="text-right text-sm">{a.balance > 0 ? formatMoney(a.balance) : '-'}</TableCell><TableCell className="text-right text-sm">{a.balance < 0 ? formatMoney(-a.balance) : '-'}</TableCell></TableRow>
                ))}
                <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-300"><TableCell colSpan={3}>Total</TableCell><TableCell className="text-right">{formatMoney(totalDebit)}</TableCell><TableCell className="text-right">{formatMoney(totalCredit)}</TableCell></TableRow>
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="vouchers" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            {vouchers.length === 0 ? <EmptyState title="No vouchers" description="Create a journal voucher to record transactions" icon={BookOpen} /> : (
              <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Voucher #</TableHead><TableHead className="text-center">Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Date</TableHead><TableHead className="text-center">Entries</TableHead></TableRow></TableHeader>
                <TableBody>{vouchers.map((v: any) => (
                  <TableRow key={v.id}><TableCell className="font-mono text-xs">{v.voucherNumber}</TableCell><TableCell className="text-center text-xs">{v.type}</TableCell><TableCell className="text-sm text-slate-600">{v.description || '-'}</TableCell><TableCell className="text-right font-medium">{formatMoney(v.amount)}</TableCell><TableCell className="text-sm text-slate-500">{formatDate(v.date)}</TableCell><TableCell className="text-center text-sm">{v.entries?.length || 0}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="accounts" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Code</TableHead><TableHead>Account Name</TableHead><TableHead className="text-center">Type</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
              <TableBody>{accounts.map((a: any) => (<TableRow key={a.id}><TableCell className="font-mono text-xs">{a.code}</TableCell><TableCell className="font-medium">{a.name}</TableCell><TableCell className="text-center text-xs">{a.type}</TableCell><TableCell className="text-center"><span className={`text-xs ${a.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{a.isActive ? 'Active' : 'Inactive'}</span></TableCell></TableRow>))}</TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NewVoucherButton({ accounts }: { accounts: any[] }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('JOURNAL')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [entries, setEntries] = useState<any[]>([{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }])
  const [saving, setSaving] = useState(false)
  const totalDebit = entries.reduce((s, e) => s + (Number(e.debit) || 0), 0)
  const totalCredit = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  function updateEntry(idx: number, patch: any) { setEntries((p) => p.map((e, i) => i === idx ? { ...e, ...patch } : e)) }
  function addEntry() { setEntries((p) => [...p, { accountId: '', debit: 0, credit: 0 }]) }
  function removeEntry(idx: number) { setEntries((p) => p.filter((_, i) => i !== idx)) }

  async function save() {
    setSaving(true)
    try {
      const valid = entries.filter((e) => e.accountId && (e.debit > 0 || e.credit > 0))
      if (valid.length < 2) { toast.error('At least 2 entries required'); setSaving(false); return }
      if (!balanced) { toast.error('Debit and Credit must be equal'); setSaving(false); return }
      const res = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, date, description, entries: valid }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Voucher created')
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setOpen(false)
      setEntries([{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }])
      setDescription('')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> New Voucher</Button>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader><DialogTitle>New Journal Voucher</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Field label="Voucher Type"><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{VOUCHER_TYPES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field></div>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50"><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{entries.map((e, i) => (
            <TableRow key={i}><TableCell><Select value={e.accountId} onValueChange={(v) => updateEntry(i, { accountId: v })}><SelectTrigger className="h-8"><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent></Select></TableCell><TableCell><Input type="number" value={e.debit || ''} onChange={(ev) => updateEntry(i, { debit: Number(ev.target.value), credit: 0 })} className="h-8 w-24 text-right text-xs" /></TableCell><TableCell><Input type="number" value={e.credit || ''} onChange={(ev) => updateEntry(i, { credit: Number(ev.target.value), debit: 0 })} className="h-8 w-24 text-right text-xs" /></TableCell><TableCell>{entries.length > 2 && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEntry(i)}><Trash2 className="w-3.5 h-3.5" /></Button>}</TableCell></TableRow>
          ))}</TableBody>
        </Table>
        <div className="flex justify-between items-center mt-2">
          <Button variant="outline" size="sm" onClick={addEntry}><Plus className="w-4 h-4 mr-1" /> Add Line</Button>
          <div className={`text-sm font-bold ${balanced ? 'text-emerald-600' : 'text-red-600'}`}>Debit: {formatMoney(totalDebit)} | Credit: {formatMoney(totalCredit)} {balanced ? '✓ Balanced' : '✗ Unbalanced'}</div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving || !balanced} className="bg-primary">{saving ? 'Saving...' : 'Create Voucher'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
