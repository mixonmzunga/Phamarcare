'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers'
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/nav'
import { Plus, Edit, UserPlus, KeyRound } from 'lucide-react'

const ROLES = Object.entries(ROLE_LABELS)

export function UsersModule() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: async () => (await fetch('/api/users')).json() })
  const users = data?.items || []

  const delMut = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/users/${id}`, { method: 'DELETE' }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('User deactivated'); qc.invalidateQueries({ queryKey: ['users'] }); setDeleteId(null) }, onError: (e: any) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="User Management" subtitle={`${users.length} user(s) · Role-Based Access Control`} actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }} className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Add User</Button>} />
      <Card className="border-slate-200 shadow-sm mb-4">
        <div className="p-4"><h3 className="font-semibold text-slate-700 mb-2">System Roles</h3><div className="flex flex-wrap gap-2">{ROLES.map(([key, label]) => <Badge key={key} variant="secondary">{label}</Badge>)}</div></div>
      </Card>
      <Card className="border-slate-200 shadow-sm">
        {isLoading ? <div className="p-4"><LoadingState /></div> : users.length === 0 ? <EmptyState title="No users" icon={UserPlus} /> : (
          <div className="overflow-x-auto scroll-thin"><div className="min-w-[640px]"><Table>
            <TableHeader><TableRow className="bg-slate-50"><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="text-center">Status</TableHead><TableHead>Last Login</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-800">{u.name}{u.id === currentUser?.id && <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>}</TableCell>
                  <TableCell className="text-sm text-slate-600">{u.email}</TableCell>
                  <TableCell><Badge variant="default">{ROLE_LABELS[u.role] || u.role}</Badge></TableCell>
                  <TableCell className="text-center"><Badge variant={u.isActive ? 'default' : 'secondary'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-sm text-slate-500">{u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(u); setDialogOpen(true) }}><Edit className="w-4 h-4" /></Button>
                    {u.id !== currentUser?.id && <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)} className="text-destructive"><KeyRound className="w-4 h-4" /></Button>}
                  </div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div></div>
        )}
      </Card>
      {dialogOpen && <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />}
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Deactivate User" description="This user will be deactivated and cannot log in." confirmText="Deactivate" onConfirm={() => { if (deleteId) delMut.mutate(deleteId) }} />
    </div>
  )
}

function UserDialog({ open, onOpenChange, editing }: any) {
  const qc = useQueryClient()
  const [form, setForm] = useState<any>(editing || { name: '', email: '', password: '', role: 'CASHIER', isActive: true })
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      const url = editing ? `/api/users/${editing.id}` : '/api/users'
      const method = editing ? 'PUT' : 'POST'
      const payload = { ...form }
      if (editing && !form.password) delete payload.password
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(editing ? 'User updated' : 'User created')
      qc.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <Field label="Full Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label={editing ? 'New Password (leave blank to keep)' : 'Password *'}><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role"><Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></Field>
        {editing && <label className="flex items-center gap-2 text-sm"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /> Active</label>}
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={saving || !form.name || !form.email || (!editing && !form.password)} className="bg-primary">{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
    </DialogContent></Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
