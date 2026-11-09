'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader, LoadingState } from '@/components/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Save, Building2, Percent, Printer, CreditCard, Shield } from 'lucide-react'

export function SettingsModule() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings-all'], queryFn: async () => (await fetch('/api/settings')).json() })
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const settings = { ...data, ...form }

  function set(key: string, value: string) { setForm((p) => ({ ...p, [key]: value })) }

  const saveMut = useMutation({
    mutationFn: async (data: Record<string, string>) => { const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const d = await res.json(); if (!res.ok) throw new Error(d.error); return d },
    onSuccess: () => { toast.success('Settings saved'); setForm({}); qc.invalidateQueries({ queryKey: ['settings-all'] }); qc.invalidateQueries({ queryKey: ['settings'] }) }, onError: (e: any) => toast.error(e.message),
  })

  async function save() { setSaving(true); saveMut.mutate(form); setSaving(false) }

  if (isLoading) return <div><PageHeader title="Settings" /><LoadingState /></div>

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your pharmacy system" actions={<Button onClick={save} disabled={saving || Object.keys(form).length === 0} className="bg-primary"><Save className="w-4 h-4 mr-2" /> Save Changes</Button>} />
      <Tabs defaultValue="pharmacy">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="pharmacy"><Building2 className="w-4 h-4 mr-1.5" /> Pharmacy</TabsTrigger>
          <TabsTrigger value="tax"><Percent className="w-4 h-4 mr-1.5" /> Tax & Currency</TabsTrigger>
          <TabsTrigger value="receipt"><Printer className="w-4 h-4 mr-1.5" /> Receipt</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1.5" /> Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="pharmacy" className="mt-4">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Pharmacy Information</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4">
            <Field label="Pharmacy Name"><Input value={settings.pharmacyName || ''} onChange={(e) => set('pharmacyName', e.target.value)} /></Field>
            <Field label="Phone"><Input value={settings.pharmacyPhone || ''} onChange={(e) => set('pharmacyPhone', e.target.value)} /></Field>
            <Field label="Email"><Input value={settings.pharmacyEmail || ''} onChange={(e) => set('pharmacyEmail', e.target.value)} /></Field>
            <Field label="Logo URL"><Input value={settings.pharmacyLogo || ''} onChange={(e) => set('pharmacyLogo', e.target.value)} placeholder="Optional logo URL" /></Field>
            <div className="col-span-2"><Field label="Address"><Textarea value={settings.pharmacyAddress || ''} onChange={(e) => set('pharmacyAddress', e.target.value)} rows={2} /></Field></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tax" className="mt-4">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Tax & Currency Settings</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4">
            <Field label="Currency"><Input value={settings.currency || ''} onChange={(e) => set('currency', e.target.value)} /></Field>
            <Field label="Currency Symbol"><Input value={settings.currencySymbol || ''} onChange={(e) => set('currencySymbol', e.target.value)} /></Field>
            <Field label="Default VAT %"><Input type="number" step="0.01" value={settings.vatPercent || ''} onChange={(e) => set('vatPercent', e.target.value)} /></Field>
            <div className="flex items-center gap-3 pt-6"><Switch checked={settings.enableVat === 'true'} onCheckedChange={(v) => set('enableVat', v ? 'true' : 'false')} /><Label>Enable VAT on sales</Label></div>
            <Field label="Low Stock Threshold"><Input type="number" value={settings.lowStockThreshold || ''} onChange={(e) => set('lowStockThreshold', e.target.value)} /></Field>
            <Field label="Expiry Alert (days)"><Input type="number" value={settings.expiryAlertDays || ''} onChange={(e) => set('expiryAlertDays', e.target.value)} /></Field>
            <Field label="Timezone"><Input value={settings.timezone || ''} onChange={(e) => set('timezone', e.target.value)} /></Field>
            <Field label="Date Format"><Input value={settings.dateFormat || ''} onChange={(e) => set('dateFormat', e.target.value)} /></Field>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="receipt" className="mt-4">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Receipt & Invoice Settings</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4">
            <Field label="Invoice Prefix"><Input value={settings.invoicePrefix || ''} onChange={(e) => set('invoicePrefix', e.target.value)} /></Field>
            <Field label="Purchase Prefix"><Input value={settings.purchasePrefix || ''} onChange={(e) => set('purchasePrefix', e.target.value)} /></Field>
            <div className="col-span-2"><Field label="Receipt Footer"><Textarea value={settings.receiptFooter || ''} onChange={(e) => set('receiptFooter', e.target.value)} rows={3} /></Field></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader><CardContent>
            <Field label="Available Payment Methods (comma-separated)"><Textarea value={settings.paymentMethods || ''} onChange={(e) => set('paymentMethods', e.target.value)} rows={3} /></Field>
            <p className="text-xs text-slate-400 mt-2">Options: CASH, AIRTEL_MONEY, TNM_MPAMBA, BANK, CARD, CREDIT</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>{children}</div>
}
