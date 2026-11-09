import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSession()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const items = await db.backup.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json({ items })
  } catch (e) { return errorResponse(e) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('backup.create')
    const body = await req.json()
    const action = body.action || 'create'

    if (action === 'create') {
      // For PostgreSQL/Supabase, we export the key tables as JSON
      // A full database dump would require pg_dump which isn't available in serverless
      const [users, medicines, customers, suppliers, sales, purchases, batches] = await Promise.all([
        db.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true } }),
        db.medicine.findMany(),
        db.customer.findMany(),
        db.supplier.findMany(),
        db.sale.findMany({ select: { id: true, invoiceNumber: true, totalAmount: true, createdAt: true } }),
        db.purchase.findMany({ select: { id: true, invoiceNumber: true, totalAmount: true, createdAt: true } }),
        db.batch.findMany(),
      ])

      const backupData = {
        exportedAt: new Date().toISOString(),
        version: 1,
        counts: {
          users: users.length,
          medicines: medicines.length,
          customers: customers.length,
          suppliers: suppliers.length,
          sales: sales.length,
          purchases: purchases.length,
          batches: batches.length,
        },
        data: { users, medicines, customers, suppliers, sales, purchases, batches },
      }

      const jsonStr = JSON.stringify(backupData, null, 2)
      const size = Buffer.byteLength(jsonStr, 'utf-8')
      const filename = `pharmacare-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`

      // Store backup metadata in database
      const backup = await db.backup.create({
        data: { filename, size, type: 'MANUAL', status: 'SUCCESS' },
      })

      // Return the backup as a downloadable JSON file
      return NextResponse.json({
        item: backup,
        downloadUrl: `data:application/json;base64,${Buffer.from(jsonStr).toString('base64')}`,
      })
    }

    if (action === 'restore') {
      return NextResponse.json({ error: 'Restore requires manual confirmation. Contact administrator.' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) { return errorResponse(e) }
}
