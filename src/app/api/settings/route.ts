import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'
import { DEFAULT_SETTINGS, clearSettingsCache } from '@/lib/settings'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const rows = await db.setting.findMany()
    const map: Record<string, string> = {}
    for (const d of DEFAULT_SETTINGS) map[d.key] = d.value
    for (const r of rows) map[r.key] = r.value
    return NextResponse.json(map)
  } catch (e) { return errorResponse(e) }
}

export async function PUT(req: NextRequest) {
  try {
    await requirePermission('settings.edit')
    const body = await req.json() as Record<string, string>
    for (const [key, value] of Object.entries(body)) {
      await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    }
    clearSettingsCache()
    return NextResponse.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
