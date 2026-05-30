import { supabase } from '@/lib/supabase'
import type { Complaint, ComplaintStatus, Resident, User } from '@/shared/types'
import { createNotification } from './notificationService'

export type ComplaintWithResident = Complaint & {
  resident: Resident & { user: User }
}

export async function fetchComplaintsBySociety(
  societyId: string
): Promise<ComplaintWithResident[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select('*, resident:residents!complaints_resident_id_fkey(*, user:users!residents_user_id_fkey(*))')
    .eq('society_id', societyId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ComplaintWithResident[]
}

export async function fetchComplaintsByResident(residentId: string): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Complaint[]
}

export async function createComplaint(input: {
  residentId: string
  societyId:  string
  title:      string
  description: string
}): Promise<Complaint> {
  const { data, error } = await supabase
    .from('complaints')
    .insert({
      resident_id: input.residentId,
      society_id:  input.societyId,
      title:       input.title,
      description: input.description,
      status:      'open',
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to file complaint')

  notifyRwaAdminsOfNewComplaint(input.societyId, input.title).catch((e) =>
    console.error('notify RWA admins of complaint failed', e),
  )

  return data as Complaint
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus
): Promise<void> {
  const { data: complaint } = await supabase
    .from('complaints')
    .select('resident_id, title')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('complaints')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)

  if (complaint?.resident_id) {
    notifyResidentOfComplaintUpdate(complaint.resident_id as string, complaint.title as string, status)
      .catch((e) => console.error('notify resident of complaint update failed', e))
  }
}

// ─── Notification helpers ─────────────────────────────────────────────────────

async function notifyRwaAdminsOfNewComplaint(societyId: string, title: string): Promise<void> {
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'rwa_admin')
    .eq('society_id', societyId)

  await Promise.allSettled(
    (admins ?? []).map((a) =>
      createNotification({
        userId: a.id as string,
        type:   'complaint',
        title:  'New complaint filed',
        body:   `A resident filed a complaint: "${title}". Tap to review.`,
        link:   '/rwa-admin/complaints',
      }),
    ),
  )
}

async function notifyResidentOfComplaintUpdate(
  residentId: string,
  title:      string,
  status:     ComplaintStatus,
): Promise<void> {
  const { data: resident } = await supabase
    .from('residents')
    .select('user_id')
    .eq('id', residentId)
    .maybeSingle()
  if (!resident?.user_id) return

  const labels: Record<ComplaintStatus, string> = {
    open:        'Open',
    in_progress: 'In progress',
    resolved:    'Resolved',
    closed:      'Closed',
  }

  await createNotification({
    userId: resident.user_id as string,
    type:   'complaint',
    title:  `Complaint ${labels[status].toLowerCase()}`,
    body:   `Your complaint "${title}" is now ${labels[status].toLowerCase()}.`,
    link:   '/resident/complaints',
  })
}
