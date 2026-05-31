import { supabase } from '@/lib/supabase'
import type { ResidentSavedAddress } from '@/shared/types'

export async function fetchSavedAddresses(residentId: string): Promise<ResidentSavedAddress[]> {
  const { data, error } = await supabase
    .from('resident_saved_addresses')
    .select('*')
    .eq('resident_id', residentId)
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

export async function deleteSavedAddress(id: string): Promise<void> {
  const { error } = await supabase
    .from('resident_saved_addresses')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
