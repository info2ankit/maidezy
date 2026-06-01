import { supabase } from '@/lib/supabase'
import type { KycStatus } from '@/shared/types'
import { createNotification } from '@/shared/services/notificationService'

export interface WorkerAdminMeta {
  user_id:     string
  society_ids: string[]
  gender:      string
}

export interface WorkerForAdmin {
  user_id:             string
  name:                string | null
  mobile:              string
  is_active:           boolean
  kyc_status:          KycStatus
  aadhaar_url:         string | null
  photo_url:           string | null
  gender:              string | null
  address:             string | null
  /** Societies this worker is currently active in. */
  society_ids:         string[]
  /** Societies this worker was removed from (restorable). */
  removed_society_ids: string[]
}

export interface WaDashboardStats {
  total:     number
  submitted: number
  approved:  number
  rejected:  number
  pending:   number
  /** Workers removed from at least one of the admin's societies (no longer serving there). */
  removed:   number
}

export type WorkerSocietyAction = 'removed' | 'restored'

export interface WorkerActionLogEntry {
  id:         string
  worker_id:  string
  society_id: string
  admin_id:   string
  action:     WorkerSocietyAction
  reason:     string | null
  created_at: string
  /** Joined */
  admin_name?: string | null
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

/**
 * Returns every worker that has any overlap with the admin's societies — whether
 * they are currently *active* there or have been *removed* from there.
 *
 * The UI then splits this list into Active vs Removed based on whether the
 * admin's societies appear in `society_ids` (active) or only in
 * `removed_society_ids` (removed-from-my-society).
 */
export async function fetchWorkersForAdmin(societyIds: string[]): Promise<WorkerForAdmin[]> {
  if (societyIds.length === 0) return []

  // Workers currently serving any of the admin's societies
  const { data: active, error: aErr } = await supabase
    .from('service_providers')
    .select('user_id, society_ids, removed_society_ids, kyc_status, gender, address')
    .overlaps('society_ids', societyIds)
  if (aErr) throw new Error(aErr.message)

  // Workers previously removed from any of the admin's societies
  const { data: removed, error: rErr } = await supabase
    .from('service_providers')
    .select('user_id, society_ids, removed_society_ids, kyc_status, gender, address')
    .overlaps('removed_society_ids', societyIds)
  if (rErr) throw new Error(rErr.message)

  // Legacy: providers using the deprecated single society_id column
  const { data: legacy } = await supabase
    .from('service_providers')
    .select('user_id, society_ids, removed_society_ids, kyc_status, gender, address')
    .in('society_id', societyIds)

  const merged: Array<{
    user_id:             string
    society_ids:         string[] | null
    removed_society_ids: string[] | null
    kyc_status:          string
    gender:              string | null
    address:             string | null
  }> = []
  const seen = new Set<string>()
  for (const row of [...(active ?? []), ...(removed ?? []), ...(legacy ?? [])]) {
    if (seen.has(row.user_id)) continue
    seen.add(row.user_id)
    merged.push(row)
  }
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
      user_id:             p.user_id,
      name:                user?.name ?? null,
      mobile:              user?.mobile ?? '',
      is_active:           user?.is_active ?? true,
      kyc_status:          kycStatus,
      aadhaar_url:         kyc?.aadhaar_url ?? null,
      photo_url:           kyc?.photo_url   ?? null,
      gender:              p.gender  ?? null,
      address:             p.address ?? null,
      society_ids:         p.society_ids ?? [],
      removed_society_ids: p.removed_society_ids ?? [],
    }
  })
}

// ─── KYC review (unchanged) ───────────────────────────────────────────────────

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

  createNotification({
    userId: workerId,
    type:   'kyc',
    title:  decision === 'approved' ? 'KYC approved' : 'KYC rejected',
    body:   decision === 'approved'
      ? 'Your KYC has been approved. You can now accept bookings.'
      : rejectionNotes
        ? `Your KYC was rejected: ${rejectionNotes}. Tap to re-upload.`
        : 'Your KYC was rejected. Tap to re-upload.',
    link:   '/provider/kyc',
  }).catch((e) => console.error('notify worker of KYC decision failed', e))
}

// ─── Society-scoped activation ────────────────────────────────────────────────

interface RemoveOpts {
  workerId:    string
  societyId:   string
  societyName: string
  adminId:     string
  reason:      string
}

/**
 * Removes a worker from a single society:
 *   1. drops the society_id from service_providers.society_ids
 *   2. adds it to service_providers.removed_society_ids (restorable history)
 *   3. writes an audit row to worker_society_actions
 *   4. notifies the worker
 *
 * Does NOT touch users.is_active or other societies the worker serves.
 */
export async function removeWorkerFromSociety(opts: RemoveOpts): Promise<WorkerForAdmin> {
  const { workerId, societyId, societyName, adminId, reason } = opts

  const { data: sp, error: fetchErr } = await supabase
    .from('service_providers')
    .select('user_id, society_ids, removed_society_ids')
    .eq('user_id', workerId)
    .maybeSingle()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!sp) throw new Error('Worker not found.')

  const currentActive  = (sp.society_ids ?? []) as string[]
  const currentRemoved = (sp.removed_society_ids ?? []) as string[]

  const nextActive  = currentActive.filter((id) => id !== societyId)
  const nextRemoved = currentRemoved.includes(societyId)
    ? currentRemoved
    : [...currentRemoved, societyId]

  const { error: upErr } = await supabase
    .from('service_providers')
    .update({ society_ids: nextActive, removed_society_ids: nextRemoved })
    .eq('user_id', workerId)
  if (upErr) throw new Error(upErr.message)

  const { error: logErr } = await supabase
    .from('worker_society_actions')
    .insert({
      worker_id:  workerId,
      society_id: societyId,
      admin_id:   adminId,
      action:     'removed',
      reason:     reason.trim() || null,
    })
  if (logErr) console.error('audit log insert failed', logErr)

  createNotification({
    userId: workerId,
    type:   'system',
    title:  'Removed from a society',
    body:   `You can no longer accept bookings in ${societyName}. ${
      nextActive.length === 0
        ? 'You currently have no assigned societies — contact your admin.'
        : `You are still active in ${nextActive.length} other societ${nextActive.length === 1 ? 'y' : 'ies'}.`
    }`,
    link:   '/provider/dashboard',
  }).catch((e) => console.error('notify worker of removal failed', e))

  return await refreshWorker(workerId)
}

interface RestoreOpts {
  workerId:    string
  societyId:   string
  societyName: string
  adminId:     string
}

/**
 * Restores a worker to a society:
 *   1. removes society_id from removed_society_ids
 *   2. adds it to society_ids (if missing)
 *   3. audits the action
 *   4. notifies the worker
 */
export async function restoreWorkerToSociety(opts: RestoreOpts): Promise<WorkerForAdmin> {
  const { workerId, societyId, societyName, adminId } = opts

  const { data: sp, error: fetchErr } = await supabase
    .from('service_providers')
    .select('user_id, society_ids, removed_society_ids')
    .eq('user_id', workerId)
    .maybeSingle()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!sp) throw new Error('Worker not found.')

  const currentActive  = (sp.society_ids ?? []) as string[]
  const currentRemoved = (sp.removed_society_ids ?? []) as string[]

  const nextActive  = currentActive.includes(societyId) ? currentActive : [...currentActive, societyId]
  const nextRemoved = currentRemoved.filter((id) => id !== societyId)

  const { error: upErr } = await supabase
    .from('service_providers')
    .update({ society_ids: nextActive, removed_society_ids: nextRemoved })
    .eq('user_id', workerId)
  if (upErr) throw new Error(upErr.message)

  const { error: logErr } = await supabase
    .from('worker_society_actions')
    .insert({
      worker_id:  workerId,
      society_id: societyId,
      admin_id:   adminId,
      action:     'restored',
      reason:     null,
    })
  if (logErr) console.error('audit log insert failed', logErr)

  createNotification({
    userId: workerId,
    type:   'system',
    title:  'Restored to a society',
    body:   `You can now accept bookings in ${societyName} again.`,
    link:   '/provider/dashboard',
  }).catch((e) => console.error('notify worker of restore failed', e))

  return await refreshWorker(workerId)
}

/**
 * Fetches the action history for a worker, scoped to the admin's societies
 * (so an admin only sees actions affecting societies they manage).
 *
 * Includes admin name join.
 */
export async function fetchWorkerActions(
  workerId:        string,
  adminSocietyIds: string[],
): Promise<WorkerActionLogEntry[]> {
  if (adminSocietyIds.length === 0) return []

  const { data, error } = await supabase
    .from('worker_society_actions')
    .select('id, worker_id, society_id, admin_id, action, reason, created_at')
    .eq('worker_id', workerId)
    .in('society_id', adminSocietyIds)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Omit<WorkerActionLogEntry, 'admin_name'>[]
  if (rows.length === 0) return []

  const adminIds = Array.from(new Set(rows.map((r) => r.admin_id)))
  const { data: admins } = await supabase
    .from('users').select('id, name').in('id', adminIds)
  const adminMap = new Map((admins ?? []).map((a) => [a.id, a.name as string | null]))

  return rows.map((r) => ({ ...r, admin_name: adminMap.get(r.admin_id) ?? null }))
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Computes dashboard stats from a worker list and the admin's society scope.
 *
 * A worker counts as "removed" if any of the admin's societies appears in their
 * removed_society_ids but none appear in society_ids — meaning the worker is no
 * longer serving the admin's societies.
 */
export function computeStats(
  workers:         WorkerForAdmin[],
  adminSocietyIds: string[],
): WaDashboardStats {
  const adminSet = new Set(adminSocietyIds)
  return workers.reduce(
    (acc, w) => {
      const stillActiveHere = w.society_ids.some((s) => adminSet.has(s))
      if (!stillActiveHere) {
        acc.removed++
        return acc  // removed workers don't count toward KYC funnel
      }
      acc.total++
      acc[w.kyc_status]++
      return acc
    },
    { total: 0, submitted: 0, approved: 0, rejected: 0, pending: 0, removed: 0 },
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function refreshWorker(workerId: string): Promise<WorkerForAdmin> {
  const { data: sp, error: spErr } = await supabase
    .from('service_providers')
    .select('user_id, society_ids, removed_society_ids, kyc_status, gender, address')
    .eq('user_id', workerId)
    .maybeSingle()
  if (spErr) throw new Error(spErr.message)
  if (!sp)   throw new Error('Worker not found after update.')

  const [{ data: user }, { data: kyc }] = await Promise.all([
    supabase.from('users').select('id, name, mobile, is_active').eq('id', workerId).maybeSingle(),
    supabase.from('kyc_documents').select('aadhaar_url, photo_url, status').eq('user_id', workerId).maybeSingle(),
  ])

  const hasDoc = !!(kyc?.aadhaar_url || kyc?.photo_url)
  const kycStatus: KycStatus =
    sp.kyc_status === 'pending' && hasDoc ? 'submitted' : (sp.kyc_status as KycStatus)

  return {
    user_id:             workerId,
    name:                user?.name ?? null,
    mobile:              user?.mobile ?? '',
    is_active:           user?.is_active ?? true,
    kyc_status:          kycStatus,
    aadhaar_url:         kyc?.aadhaar_url ?? null,
    photo_url:           kyc?.photo_url   ?? null,
    gender:              sp.gender  ?? null,
    address:             sp.address ?? null,
    society_ids:         (sp.society_ids ?? []) as string[],
    removed_society_ids: (sp.removed_society_ids ?? []) as string[],
  }
}
