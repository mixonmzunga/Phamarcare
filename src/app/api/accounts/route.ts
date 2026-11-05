import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'
import { z } from 'zod'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const accounts = await db.account.findMany({ orderBy: { code: 'asc' } })
    const vouchers = await db.voucher.findMany({ orderBy: { date: 'desc' }, take: 200, include: { entries: { include: { account: true } }, createdBy: { select: { name: true } } } })
    // Trial balance
    const balances = await Promise.all(accounts.map(async (a) => {
      const entries = await db.journalEntry.findMany({ where: { accountId: a.id }, select: { debit: true, credit: true } })
      const debit = entries.reduce((s, e) => s + e.debit, 0)
      const credit = entries.reduce((s, e) => s + e.credit, 0)
      return { ...a, balance: debit - credit, totalDebit: debit, totalCredit: credit }
    }))
    return NextResponse.json({ accounts, vouchers, trialBalance: balances })
  } catch (e) { return errorResponse(e) }
}

const voucherSchema = z.object({
  type: z.string(),
  date: z.string(),
  description: z.string().optional(),
  entries: z.array(z.object({ accountId: z.string(), debit: z.number().default(0), credit: z.number().default(0), description: z.string().optional() })).min(2),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('accounts.create')
    const body = await req.json()
    const parsed = voucherSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const data = parsed.data
    const totalDebit = data.entries.reduce((s, e) => s + e.debit, 0)
    const totalCredit = data.entries.reduce((s, e) => s + e.credit, 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({ error: 'Debit and Credit must be equal (double-entry rule)' }, { status: 400 })
    }
    const year = new Date().getFullYear()
    const count = await db.voucher.count({ where: { voucherNumber: { startsWith: `JV-${year}` } } })
    const voucherNumber = `JV-${year}-${String(count + 1).padStart(6, '0')}`
    const voucher = await db.voucher.create({
      data: {
        voucherNumber, type: data.type, date: new Date(data.date), description: data.description,
        amount: totalDebit, status: 'APPROVED', createdById: user.id,
        entries: { create: data.entries },
      },
      include: { entries: true },
    })
    return NextResponse.json({ item: voucher })
  } catch (e) { return errorResponse(e) }
}
