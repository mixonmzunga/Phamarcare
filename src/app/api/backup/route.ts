import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'
import { promises as fs } from 'fs'
import path from 'path'

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
      const backupDir = path.join(process.cwd(), 'backups')
      await fs.mkdir(backupDir, { recursive: true })
      const filename = `pharmacare-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
      const filepath = path.join(backupDir, filename)
      // SQLite: copy the db file
      const dbPath = path.join(process.cwd(), 'db', 'custom.db')
      try {
        await fs.copyFile(dbPath, filepath)
      } catch (e) {
        return NextResponse.json({ error: 'Backup failed: could not copy database' }, { status: 500 })
      }
      const stat = await fs.stat(filepath)
      const backup = await db.backup.create({ data: { filename, size: stat.size, type: 'MANUAL', status: 'SUCCESS' } })
      return NextResponse.json({ item: backup })
    }
    if (action === 'restore') {
      // Restore would overwrite the db - for safety, we record but require manual confirmation
      return NextResponse.json({ error: 'Restore requires manual confirmation. Contact administrator.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) { return errorResponse(e) }
}
