// Migrate medicine image URLs from local paths to Supabase Storage URLs
// Run this after running supabase-setup.ts and db:push
// Usage: bunx tsx scripts/migrate-images.ts

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { promises as fs } from 'fs'
import path from 'path'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const prisma = new PrismaClient()
const MEDICINES_BUCKET = 'medicines'

async function main() {
  console.log('========================================')
  console.log('  Migrate Medicine Images to Supabase')
  console.log('========================================\n')

  // Get all medicines with local image paths (starting with /medicines/)
  const medicines = await prisma.medicine.findMany({
    where: { image: { startsWith: '/medicines/' } },
    select: { id: true, name: true, image: true },
  })

  console.log(`Found ${medicines.length} medicines with local image paths`)

  if (medicines.length === 0) {
    console.log('No images to migrate. All done!')
    return
  }

  let migrated = 0
  let failed = 0

  for (const med of medicines) {
    if (!med.image) continue

    // Extract filename from local path: /medicines/paracetamol.png → paracetamol.png
    const filename = med.image.replace('/medicines/', '')
    const localPath = path.join(process.cwd(), 'public', 'medicines', filename)

    try {
      // Check if file exists locally
      await fs.access(localPath)
      const buffer = await fs.readFile(localPath)
      const ext = filename.split('.').pop()?.toLowerCase() || 'png'
      const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`

      // Upload to Supabase
      const { error } = await supabase.storage
        .from(MEDICINES_BUCKET)
        .upload(filename, buffer, { contentType, upsert: true })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage.from(MEDICINES_BUCKET).getPublicUrl(filename)
      const publicUrl = urlData.publicUrl

      // Update database with Supabase URL
      await prisma.medicine.update({
        where: { id: med.id },
        data: { image: publicUrl },
      })

      console.log(`  ✅ ${med.name}: ${filename} → ${publicUrl}`)
      migrated++
    } catch (e: any) {
      console.error(`  ❌ ${med.name}: ${e.message}`)
      failed++
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${failed} failed`)
  console.log('\nAll medicine images now use Supabase Storage URLs.')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
