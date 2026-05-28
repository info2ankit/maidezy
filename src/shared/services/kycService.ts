import { supabase } from '@/lib/supabase'
import type { KycDocument } from '@/shared/types'

const BUCKET = 'kyc-docs'

function extractStoragePath(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length).split('?')[0]
}

export async function uploadKycFile(
  userId: string,
  kind: 'aadhaar' | 'photo',
  file: File,
  oldUrl?: string | null,
): Promise<string> {
  // Delete the previous file first so storage stays clean
  if (oldUrl) {
    const oldPath = extractStoragePath(oldUrl)
    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath])
      // Ignore deletion errors — file may already be gone
    }
  }

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${kind}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function fetchKycByUserId(userId: string): Promise<KycDocument | null> {
  const { data, error } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as KycDocument | null
}

export async function upsertKycDocument(
  userId: string,
  aadhaarUrl: string | null,
  photoUrl: string | null
): Promise<KycDocument> {
  const existing = await fetchKycByUserId(userId)

  if (existing) {
    const { data, error } = await supabase
      .from('kyc_documents')
      .update({
        aadhaar_url: aadhaarUrl ?? existing.aadhaar_url,
        photo_url:   photoUrl   ?? existing.photo_url,
        status:      'pending',
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as KycDocument
  }

  const { data, error } = await supabase
    .from('kyc_documents')
    .insert({
      user_id:     userId,
      aadhaar_url: aadhaarUrl,
      photo_url:   photoUrl,
      status:      'pending',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as KycDocument
}
