import { supabase } from '@/lib/supabase'
import type { ResidentSavedAddress } from '@/shared/types'

export async function fetchSavedAddresses(residentId: string): Promise<ResidentSavedAddress[]> {
  const { data, error } = await supabase
    .from('resident_saved_addresses')
    .select('*')
    .eq('resident_id', residentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ResidentSavedAddress[]
}

export async function saveSavedAddress(input: {
  residentId: string
  label: string
  societyId?: string
  societyName: string
  addressType?: 'browse_visit' | 'previous_home'
  city: string
  pincode?: string
  flatNo?: string
  block?: string
}): Promise<ResidentSavedAddress> {
  const { data, error } = await supabase
    .from('resident_saved_addresses')
    .insert({
      resident_id:  input.residentId,
      label:        input.label.trim(),
      society_id:   input.societyId ?? null,
      society_name: input.societyName.trim(),
      address_type: input.addressType ?? 'browse_visit',
      city:         input.city.trim(),
      pincode:      input.pincode?.trim() || null,
      flat_no:      input.flatNo?.trim() || null,
      block:        input.block?.trim() || null,
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to save address')
  return data as ResidentSavedAddress
}

/**
 * Soft-deletes a saved address. The row is kept with `deleted_at` set, so it
 * can be restored later if needed, and historical references stay valid.
 */
export async function deleteSavedAddress(id: string): Promise<void> {
  const { error } = await supabase
    .from('resident_saved_addresses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
  if (error) throw new Error(error.message)
}

/** Restore a previously soft-deleted saved address. */
export async function restoreSavedAddress(id: string): Promise<void> {
  const { error } = await supabase
    .from('resident_saved_addresses')
    .update({ deleted_at: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
