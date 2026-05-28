import { supabase } from '@/lib/supabase'
import type { KycDocument } from '@/shared/types'

const BUCKET = 'kyc-docs'

export async function uploadKycFile(
  userId: string,
  kind: 'aadhaar' | 'photo',
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
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
