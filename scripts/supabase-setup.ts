// Supabase Setup Script
// Run this after configuring your .env with Supabase credentials
// Usage: bunx tsx scripts/supabase-setup.ts

import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'fs'
import path from 'path'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  console.error('Current values:')
  console.error('  SUPABASE_URL:', supabaseUrl || '(not set)')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '(set)' : '(not set)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const MEDICINES_BUCKET = 'medicines'

async function setupStorage() {
  console.log('\n📦 Setting up Supabase Storage...\n')

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('Failed to list buckets:', listError.message)
    return false
  }

  const bucketExists = buckets?.some((b: any) => b.name === MEDICINES_BUCKET)

  if (!bucketExists) {
    console.log(`Creating storage bucket: ${MEDICINES_BUCKET}...`)
    const { error: createError } = await supabase.storage.createBucket(MEDICINES_BUCKET, {
      public: true,
      fileSizeLimit: '5MB',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    })

    if (createError) {
      console.error('Failed to create bucket:', createError.message)
      console.error('You may need to create it manually in the Supabase dashboard:')
      console.error('  1. Go to Storage → New bucket')
      console.error(`  2. Name: ${MEDICINES_BUCKET}`)
      console.error('  3. Public: Yes')
      console.error('  4. File size limit: 5MB')
      return false
    }
    console.log('✅ Bucket created successfully')
  } else {
    console.log('✅ Bucket already exists')
  }

  return true
}

async function uploadMedicineImages() {
  console.log('\n📸 Uploading medicine images to Supabase Storage...\n')

  const medicinesDir = path.join(process.cwd(), 'public', 'medicines')

  try {
    await fs.access(medicinesDir)
  } catch {
    console.log('No local medicine images found. Skipping upload.')
    return
  }

  const files = await fs.readdir(medicinesDir)
  const imageFiles = files.filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))

  if (imageFiles.length === 0) {
    console.log('No image files found to upload.')
    return
  }

  console.log(`Found ${imageFiles.length} images to upload`)

  let uploaded = 0
  let failed = 0

  for (const file of imageFiles) {
    const filepath = path.join(medicinesDir, file)
    const buffer = await fs.readFile(filepath)
    const ext = file.split('.').pop()?.toLowerCase() || 'png'
    const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`

    const { error } = await supabase.storage
      .from(MEDICINES_BUCKET)
      .upload(file, buffer, {
        contentType,
        upsert: true,
      })

    if (error) {
      console.error(`  ❌ ${file}: ${error.message}`)
      failed++
    } else {
      const { data: urlData } = supabase.storage.from(MEDICINES_BUCKET).getPublicUrl(file)
      console.log(`  ✅ ${file} → ${urlData.publicUrl}`)
      uploaded++
    }
  }

  console.log(`\nUpload complete: ${uploaded} succeeded, ${failed} failed`)
}

async function main() {
  console.log('========================================')
  console.log('  PharmaCare - Supabase Setup')
  console.log('========================================')
  console.log('URL:', supabaseUrl)

  const storageOk = await setupStorage()

  if (storageOk) {
    await uploadMedicineImages()
  }

  console.log('\n========================================')
  console.log('  Setup Complete!')
  console.log('========================================')
  console.log('\nNext steps:')
  console.log('1. Run database migration:')
  console.log('   bun run db:push')
  console.log('2. Run seed script:')
  console.log('   bunx tsx prisma/seed.ts')
  console.log('3. Update medicine image URLs in database to use Supabase URLs')
  console.log('   (the seed script will handle this automatically)')
  console.log('')
}

main().catch((e) => {
  console.error('Setup failed:', e)
  process.exit(1)
})
