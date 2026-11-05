import { db } from './db'

let cache: Record<string, string> | null = null

export async function getSettings(): Promise<Record<string, string>> {
  if (cache) return cache
  const rows = await db.setting.findMany()
  cache = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return cache
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const s = await getSettings()
  return s[key] ?? fallback
}

export async function getCurrency(): Promise<string> {
  return getSetting('currency', 'MWK')
}

export async function getDefaultVat(): Promise<number> {
  return Number(await getSetting('vatPercent', '16.5')) || 0
}

export async function clearSettingsCache() {
  cache = null
}

export const DEFAULT_SETTINGS: { key: string; value: string }[] = [
  { key: 'pharmacyName', value: 'PharmaCare Pharmacy' },
  { key: 'pharmacyAddress', value: 'Plot 123, Glyn Jones Road, Lilongwe, Malawi' },
  { key: 'pharmacyPhone', value: '+265 1 700 123' },
  { key: 'pharmacyEmail', value: 'info@pharmacare.mw' },
  { key: 'pharmacyLogo', value: '' },
  { key: 'currency', value: 'MWK' },
  { key: 'currencySymbol', value: 'MK' },
  { key: 'vatPercent', value: '16.5' },
  { key: 'invoicePrefix', value: 'INV' },
  { key: 'purchasePrefix', value: 'PUR' },
  { key: 'receiptFooter', value: 'Thank you for shopping with PharmaCare. Get well soon!' },
  { key: 'lowStockThreshold', value: '15' },
  { key: 'expiryAlertDays', value: '60' },
  { key: 'timezone', value: 'Africa/Blantyre' },
  { key: 'dateFormat', value: 'DD/MM/YYYY' },
  { key: 'enableVat', value: 'true' },
  { key: 'paymentMethods', value: 'CASH,AIRTEL_MONEY,TNM_MPAMBA,BANK,CARD,CREDIT' },
]
