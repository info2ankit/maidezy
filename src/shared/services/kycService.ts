import { supabase } from '@/lib/supabase'
import type { KycDocument } from '@/shared/types'
import { createNotification } from './notificationService'

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

  notifyReviewersOfKycSubmission(userId).catch((e) =>
    console.error('notify reviewers of KYC submission failed', e),
  )

  return data as KycDocument
}

/**
 * On worker KYC submission, alert every worker_admin whose societies overlap
 * with the worker's society/societies. Also pings RWA admins of those societies.
 */
async function notifyReviewersOfKycSubmission(workerUserId: string): Promise<void> {
  // 1. Find the worker's name + societies (single society_id + multi society_ids).
  const { data: sp } = await supabase
    .from('service_providers')
    .select('society_id, society_ids')
    .eq('user_id', workerUserId)
    .maybeSingle()

  if (!sp) return

  const societyIds = [
    ...(sp.society_ids ?? []),
    ...(sp.society_id ? [sp.society_id] : []),
  ].filter((v, i, a) => v && a.indexOf(v) === i)
  if (societyIds.length === 0) return

  const { data: workerUser } = await supabase
    .from('users')
    .select('name')
    .eq('id', workerUserId)
    .maybeSingle()
  const workerName = workerUser?.name ?? 'A worker'

  // 2. Find worker_admins whose society_ids overlap with the worker's societies.
  const { data: waRows } = await supabase
    .from('worker_admins')
    .select('user_id, society_ids')
    .overlaps('society_ids', societyIds)

  // 3. Find rwa_admins of those societies via the users table.
  const { data: rwaRows } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'rwa_admin')
    .in('society_id', societyIds)

  const recipients = new Set<string>([
    ...(waRows ?? []).map((r) => r.user_id as string),
    ...(rwaRows ?? []).map((r) => r.id as string),
  ])

  await Promise.allSettled(
    Array.from(recipients).map((uid) =>
      createNotification({
        userId: uid,
        type:   'kyc',
        title:  'KYC submitted',
        body:   `${workerName} submitted KYC documents for review.`,
        link:   '/worker-admin/kyc',
      }),
    ),
  )
}
