import { supabase } from '@/lib/supabase'
import { saveSavedAddress } from './residentAddressService'

export interface SocietyRequestInput {
  requestedBy: string
  name: string
  city: string
  pincode?: string
  address?: string
  // resident's own address at this society (optional — saves to resident_saved_addresses)
  residentId?: string
  flatNo?: string
  block?: string
}

export async function submitSocietyRequest(input: SocietyRequestInput): Promise<void> {
  const { error } = await supabase.from('society_requests').insert({
    requested_by: input.requestedBy,
    name:         input.name.trim(),
    city:         input.city.trim(),
    pincode:      input.pincode?.trim() || null,
    address:      input.address?.trim() || null,
  })
  if (error) throw new Error(error.message)

  // If the resident provided their address at this society, save it for future reference
  if (input.residentId && (input.flatNo?.trim() || input.block?.trim())) {
    await saveSavedAddress({
      residentId:  input.residentId,
      label:       input.name.trim(),
      societyName: input.name.trim(),
      city:        input.city.trim(),
      pincode:     input.pincode,
      flatNo:      input.flatNo,
      block:       input.block,
    })
  }
}
