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
import { formatMoney, formatDate } from '@/lib/format'
import { Plus, Edit, UserCog, Wallet, DollarSign, Users as UsersIcon } from 'lucide-react'

export function EmployeesModule() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('employees')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [paying, setPaying] = useState<any>(null)

  const { data, isLoading } = useQuery({ queryKey: ['employees'], queryFn: async () => (await fetch('/api/employees')).json() })
  const employees = data?.items || []
  const totalSalary = employees.filter((e: any) => e.status === 'ACTIVE').reduce((s: number, e: any) => s + e.salary, 0)

  return (
    <div>
      <PageHeader title="Employees / HRM" subtitle={`${employees.length} employee(s) · Monthly payroll: ${formatMoney(totalSalary)}`} actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard title="Total Employees" value={employees.filter((e: any) => e.status === 'ACTIVE').length} icon={UsersIcon} color="primary" />
        <StatCard title="Monthly Payroll" value={formatMoney(totalSalary)} icon={DollarSign} color="success" />
        <StatCard title="Departments" value={new Set(employees.map((e: any) => e.department).filter(Boolean)).size} icon={UserCog} color="info" />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100"><TabsTrigger value="employees">Employees</TabsTrigger></TabsList>
        <TabsContent value="employees" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            {isLoading ? <div className="p-4"><LoadingState /></div> : employees.length === 0 ? <EmptyState title="No employees" icon={UserCog} /> : (
              <div className="overflow-x-auto scroll-thin"><div className="min-w-[640px]"><Table>
                <TableHeader><TableRow className="bg-slate-50"><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Salary</TableHead><TableHead className="text-center">Status</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {employees.map((e: any) => (
                    <TableRow key={e.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs">{e.employeeCode}</TableCell>
                      <TableCell><div className="font-medium text-slate-800">{e.name}</div><div className="text-xs text-slate-400">{e.phone || '-'}</div></TableCell>
                      <TableCell className="text-sm text-slate-600">{e.position || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{e.department || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(e.salary)}</TableCell>
                      <TableCell className="text-center"><Badge variant={e.status === 'ACTIVE' ? 'default' : 'secondary'}>{e.status}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(e.joiningDate)}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPaying(e)} title="Pay Salary" className="text-emerald-600"><Wallet className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div></div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      {dialogOpen && <EmployeeDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />}
      {paying && <SalaryDialog employee={paying} onClose={() => setPaying(null)} />}
    </div>
  )
}

function EmployeeDialog({ open, onOpenChange, editing }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(editing || { name: '', phone: '', email: '', address: '', position: '', department: '', joiningDate: new Date().toISOString().slice(0, 10), salary: 0, status: 'ACTIVE' })
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      const url = editing ? `/api/employees/${editing.id}` : '/api/employees'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(editing ? 'Employee updated' : 'Employee added')
      qc.invalidateQueries({ queryKey: ['employees'] })
      onOpenChange(false)
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3 py-2">
        <Field label="Full Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Position"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
        <Field label="Department"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
        <Field label="Joining Date"><Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></Field>
        <Field label="Salary"><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></Field>
        <Field label="Status"><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="ON_LEAVE">On Leave</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select></Field>
        <div className="col-span-2"><Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></Field></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.name} className="bg-primary">{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function SalaryDialog({ employee, onClose }: any) {
  const qc = useQueryClient()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [amount, setAmount] = useState(employee.salary)
  const [bonus, setBonus] = useState(0)
  const [deductions, setDeductions] = useState(0)
  const [saving, setSaving] = useState(false)
  const net = (amount || 0) + (bonus || 0) - (deductions || 0)
  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${employee.id}/salaries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month, amount, bonus, deductions }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success('Salary paid')
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open onOpenChange={onClose}><DialogContent>
      <DialogHeader><DialogTitle>Pay Salary - {employee.name}</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
        <Field label="Base Salary"><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        <Field label="Bonus"><Input type="number" value={bonus || ''} onChange={(e) => setBonus(Number(e.target.value))} /></Field>
        <Field label="Deductions"><Input type="number" value={deductions || ''} onChange={(e) => setDeductions(Number(e.target.value))} /></Field>
        <div className="p-3 bg-slate-50 rounded-lg flex justify-between text-sm font-bold"><span>Net Amount</span><span className="text-primary">{formatMoney(net)}</span></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving} className="bg-primary">{saving ? 'Saving...' : 'Pay Salary'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
