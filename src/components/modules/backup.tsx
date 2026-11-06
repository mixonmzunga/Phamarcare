'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState, EmptyState, StatCard, ConfirmDialog } from '@/components/shared'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatMoney, formatDateTime } from '@/lib/format'
import { Database, Download, HardDrive, RefreshCw, ShieldAlert } from 'lucide-react'

export function BackupModule() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [restoreId, setRestoreId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['backups'], queryFn: async () => (await fetch('/api/backup')).json() })
  const backups = data?.items || []
  const totalSize = backups.reduce((s: number, b: any) => s + b.size, 0)

  const createMut = useMutation({
    mutationFn: async () => { const res = await fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create' }) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Backup created successfully'); qc.invalidateQueries({ queryKey: ['backups'] }) }, onError: (e: any) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader title="Backup & Restore" subtitle="Secure database backup and restoration (Admin only)" actions={<Button onClick={() => { setCreating(true); createMut.mutate(); setTimeout(() => setCreating(false), 500) }} disabled={creating} className="bg-primary"><Download className="w-4 h-4 mr-2" /> Create Backup</Button>} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard title="Total Backups" value={backups.length} icon={Database} color="primary" />
        <StatCard title="Total Size" value={formatMoney(totalSize).replace('MWK', '') + ' bytes'} icon={HardDrive} color="info" />
        <StatCard title="Latest" value={backups[0] ? formatDateTime(backups[0].createdAt) : 'None'} icon={RefreshCw} color="success" />
      </div>
      <Card className="border-amber-200 bg-amber-50 p-4 mb-4">
        <div className="flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Security Notice</p>
            <p>Backups contain sensitive data. Database restoration requires manual confirmation by an administrator. Never share backup files with unauthorized personnel.</p>
          </div>
        </div>
      </Card>
      <Card className="border-slate-200 shadow-sm">
        {isLoading ? <div className="p-4"><LoadingState /></div> : backups.length === 0 ? <EmptyState title="No backups yet" description="Create your first backup to secure your data" icon={Database} action={<Button onClick={() => createMut.mutate()} className="bg-primary"><Download className="w-4 h-4 mr-2" /> Create Backup</Button>} /> : (
          <div className="overflow-x-auto scroll-thin"><div className="min-w-[640px]">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="text-left p-3 text-sm font-medium text-slate-600">Filename</th><th className="text-center p-3 text-sm font-medium text-slate-600">Type</th><th className="text-center p-3 text-sm font-medium text-slate-600">Status</th><th className="text-right p-3 text-sm font-medium text-slate-600">Size</th><th className="text-left p-3 text-sm font-medium text-slate-600">Date</th></tr></thead>
              <tbody>
                {backups.map((b: any) => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 text-sm font-mono">{b.filename}</td>
                    <td className="p-3 text-center"><Badge variant="secondary">{b.type}</Badge></td>
                    <td className="p-3 text-center"><Badge variant={b.status === 'SUCCESS' ? 'default' : 'destructive'}>{b.status}</Badge></td>
                    <td className="p-3 text-right text-sm">{(b.size / 1024).toFixed(1)} KB</td>
                    <td className="p-3 text-sm text-slate-500">{formatDateTime(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </Card>
    </div>
  )
}
