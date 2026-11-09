import { createClient } from '@supabase/supabase-js'

// These environment variables must be set in .env:
// SUPABASE_URL=https://your-project.supabase.co
// SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for server-side operations)
// SUPABASE_ANON_KEY=your-anon-key (for client-side, if needed)

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Server-side client with service role key (bypasses RLS)
// Use this for admin operations: uploading files, managing storage, etc.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Storage bucket name for medicine images
export const MEDICINES_BUCKET = 'medicines'

// Helper: upload a file to Supabase Storage and return the public URL
export async function uploadToStorage(
  bucket: string,
  filePath: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType,
      upsert: true,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

// Helper: delete a file from Supabase Storage
export async function deleteFromStorage(bucket: string, filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([filePath])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}

// Helper: extract file path from a Supabase public URL
export function extractPathFromUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length)
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseServiceKey
}
