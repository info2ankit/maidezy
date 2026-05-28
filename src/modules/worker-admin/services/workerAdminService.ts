import { supabase } from '@/lib/supabase'
import type { KycStatus } from '@/shared/types'

export interface WorkerAdminMeta {
  user_id:     string
  society_ids: string[]
  gender:      string
}

export interface WorkerForAdmin {
  user_id:     string
  name:        string | null
  mobile:      string
  is_active:   boolean
  kyc_status:  KycStatus
  aadhaar_url: string | null
  photo_url:   string | null
  gender:      string | null
  address:     string | null
  society_ids: string[]
}

export interface WaDashboardStats {
  total:     number
  submitted: number
  approved:  number
  rejected:  number
  pending:   number
}

export async function fetchWorkerAdminMeta(userId: string): Promise<WorkerAdminMeta | null> {
  const { data, error } = await supabase
    .from('worker_admins')
    .select('user_id, society_ids, gender')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as WorkerAdminMeta | null
}

export async function fetchWorkersForAdmin(societyIds: string[]): Promise<WorkerForAdmin[]> {
  if (societyIds.length === 0) return []

  // Fetch providers whose society_ids overlaps with admin's assigned societies
  const { data: overlap, error: oErr } = await supabase
    .from('service_providers')
    .select('user_id, society_ids, kyc_status, gender, address')
    .overlaps('society_ids', societyIds)

  if (oErr) throw new Error(oErr.message)

  // Also catch legacy providers that only have the old single society_id field
  const { data: legacy } = await supabase
    .from('service_providers')
    .select('user_id, society_ids, kyc_status, gender, address')
    .in('society_id', societyIds)

  const seen   = new Set((overlap ?? []).map((p) => p.user_id))
  const merged = [
    ...(overlap ?? []),
    ...(legacy ?? []).filter((p) => !seen.has(p.user_id)),
  ]

  if (merged.length === 0) return []

  const userIds = merged.map((p) => p.user_id)

  const [{ data: users }, { data: kycDocs }] = await Promise.all([
    supabase.from('users').select('id, name, mobile, is_active').in('id', userIds),
    supabase.from('kyc_documents').select('user_id, aadhaar_url, photo_url, status').in('user_id', userIds),
  ])

  const userMap = new Map((users ?? []).map((u) => [u.id, u]))
  const kycMap  = new Map((kycDocs ?? []).map((k) => [k.user_id, k]))

  return merged.map((p) => {
    const user = userMap.get(p.user_id)
    const kyc  = kycMap.get(p.user_id)
    const hasDoc = !!(kyc?.aadhaar_url || kyc?.photo_url)
    const kycStatus: KycStatus =
      p.kyc_status === 'pending' && hasDoc ? 'submitted' : (p.kyc_status as KycStatus)

    return {
      user_id:     p.user_id,
      name:        user?.name ?? null,
      mobile:      user?.mobile ?? '',
      is_active:   user?.is_active ?? true,
      kyc_status:  kycStatus,
      aadhaar_url: kyc?.aadhaar_url ?? null,
      photo_url:   kyc?.photo_url   ?? null,
      gender:      p.gender  ?? null,
      address:     p.address ?? null,
      society_ids: p.society_ids ?? [],
    }
  })
}

export async function reviewWorkerKyc(
  workerId:        string,
  decision:        'approved' | 'rejected',
  reviewedBy:      string,
  rejectionNotes?: string,
): Promise<void> {
  const now = new Date().toISOString()
  const kycUpdate: Record<string, unknown> = {
    status:      decision,
    reviewed_by: reviewedBy,
    reviewed_at: now,
  }
  if (decision === 'rejected' && rejectionNotes) {
    kycUpdate.rejection_notes = rejectionNotes
  }

  const [{ error: kycErr }, { error: spErr }] = await Promise.all([
    supabase.from('kyc_documents').update(kycUpdate).eq('user_id', workerId),
    supabase.from('service_providers').update({ kyc_status: decision }).eq('user_id', workerId),
  ])
  if (kycErr) throw new Error(kycErr.message)
  if (spErr)  throw new Error(spErr.message)
}

export function computeStats(workers: WorkerForAdmin[]): WaDashboardStats {
  return workers.reduce(
    (acc, w) => {
      acc.total++
      acc[w.kyc_status]++
      return acc
    },
    { total: 0, submitted: 0, approved: 0, rejected: 0, pending: 0 },
  )
}
