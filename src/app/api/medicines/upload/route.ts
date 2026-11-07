import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, errorResponse } from '@/lib/auth'
import { uploadToStorage, MEDICINES_BUCKET, isSupabaseConfigured } from '@/lib/supabase'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    await requirePermission('medicine.edit')
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

    const ext = file.name.split('.').pop() || 'png'
    const filename = `med-${crypto.randomBytes(8).toString('hex')}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // If Supabase is configured, upload to Supabase Storage
    if (isSupabaseConfigured()) {
      try {
        const publicUrl = await uploadToStorage(MEDICINES_BUCKET, filename, buffer, file.type)
        return NextResponse.json({ url: publicUrl })
      } catch (uploadErr: any) {
        console.error('Supabase upload failed, falling back to local:', uploadErr.message)
        // Fall back to local storage if Supabase fails
      }
    }

    // Fallback: local filesystem storage
    const uploadDir = path.join(process.cwd(), 'public', 'medicines')
    await fs.mkdir(uploadDir, { recursive: true })
    const filepath = path.join(uploadDir, filename)
    await fs.writeFile(filepath, buffer)
    return NextResponse.json({ url: `/medicines/${filename}` })
  } catch (e) {
    return errorResponse(e)
  }
}
