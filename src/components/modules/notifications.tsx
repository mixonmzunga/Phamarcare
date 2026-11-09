'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, StatCard } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/format'
import { Bell, AlertTriangle, AlertCircle, Info, RefreshCw, CheckCheck, Trash2 } from 'lucide-react'

const SEVERITY_ICON: any = { WARNING: AlertTriangle, CRITICAL: AlertCircle, INFO: Info }
const TYPE_LABEL: any = { LOW_STOCK: 'Low Stock', EXPIRY: 'Expiring Soon', EXPIRED: 'Expired', DEBT: 'Outstanding Debt', PAYMENT_DUE: 'Payment Due', SYSTEM: 'System' }

export function NotificationsModule() {
  const qc = useQueryClient()
  const [generating, setGenerating] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['notifications-all'], queryFn: async () => (await fetch('/api/notifications?limit=100')).json() })
  const items = data?.items || []

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate' }) })
      const d = await res.json()
      toast.success(`${d.created} new notification(s) generated`)
      qc.invalidateQueries({ queryKey: ['notifications-all'] })
      qc.invalidateQueries({ queryKey: ['notifications-count'] })
    } catch { toast.error('Failed') } finally { setGenerating(false) }
  }
  async function markAllRead() {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'markAllRead' }) })
    qc.invalidateQueries({ queryKey: ['notifications-all'] })
    toast.success('All marked as read')
  }
  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    qc.invalidateQueries({ queryKey: ['notifications-all'] })
  }
  async function del(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    qc.invalidateQueries({ queryKey: ['notifications-all'] })
  }

  const unread = items.filter((n: any) => !n.isRead).length
  const critical = items.filter((n: any) => n.severity === 'CRITICAL').length
  const warnings = items.filter((n: any) => n.severity === 'WARNING').length

  return (
    <div>
      <PageHeader title="Notifications Center" subtitle="System alerts and reminders" actions={<><Button onClick={generate} disabled={generating} variant="outline"><RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} /> Generate Alerts</Button><Button onClick={markAllRead} variant="outline"><CheckCheck className="w-4 h-4 mr-2" /> Mark All Read</Button></>} />
      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard title="Total" value={items.length} icon={Bell} color="primary" />
        <StatCard title="Unread" value={unread} icon={Bell} color="warning" />
        <StatCard title="Critical" value={critical} icon={AlertCircle} color="danger" />
        <StatCard title="Warnings" value={warnings} icon={AlertTriangle} color="warning" />
      </div>
      <Card className="border-slate-200 shadow-sm">
        {isLoading ? <div className="p-4"><LoadingState /></div> : items.length === 0 ? <EmptyState title="No notifications" description="Click 'Generate Alerts' to scan for low stock, expiring medicines, and outstanding debts" icon={Bell} action={<Button onClick={generate} disabled={generating} className="bg-primary"><RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} /> Generate Alerts</Button>} /> : (
          <div className="divide-y divide-slate-100">
            {items.map((n: any) => {
              const Icon = SEVERITY_ICON[n.severity] || Info
              return (
                <div key={n.id} className={`flex items-start gap-3 p-4 ${n.isRead ? 'bg-white' : 'bg-sky-50/50'}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${n.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' : n.severity === 'WARNING' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}><Icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium text-slate-800">{n.title}</span><Badge variant="secondary" className="text-[10px]">{TYPE_LABEL[n.type] || n.type}</Badge>{!n.isRead && <span className="w-2 h-2 rounded-full bg-sky-500" />}</div>
                    <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!n.isRead && <Button variant="ghost" size="icon" onClick={() => markRead(n.id)} title="Mark read"><CheckCheck className="w-4 h-4" /></Button>}
                    <Button variant="ghost" size="icon" onClick={() => del(n.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
