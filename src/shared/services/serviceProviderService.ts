import { supabase } from '@/lib/supabase'
import type { ProviderWithServices, ProviderService, ServiceProvider, AvailabilitySlot, ServiceType } from '@/shared/types'

export interface ServiceOfferingInput {
  serviceType:  ServiceType
  perVisitRate:   number | null
  monthlyRate:  number | null
}

export interface CreateProviderInput {
  societyId:         string
  availabilitySlots: AvailabilitySlot[]
  services:          ServiceOfferingInput[]
}

export interface UpdateProviderInput {
  availabilitySlots?: AvailabilitySlot[]
  services?:          ServiceOfferingInput[]
}

export async function fetchProviderByUserId(userId: string): Promise<ProviderWithServices | null> {
  const { data: provider, error } = await supabase
    .from('service_providers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!provider) return null

  const [{ data: pricingRows }, { data: avail }, { data: kycDoc }] = await Promise.all([
    supabase
      .from('worker_service_pricing')
      .select('*')
      .eq('worker_id', userId)
      .eq('is_active', true),
    supabase
      .from('worker_availability')
      .select('shifts')
      .eq('worker_id', userId)
      .maybeSingle(),
    // Check whether the worker has uploaded any KYC documents yet
    supabase
      .from('kyc_documents')
      .select('aadhaar_url, photo_url')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const services: ProviderService[] = (pricingRows ?? []).map((row) => ({
    id:             row.id,
    provider_id:    provider.id,
    service_type:   row.service_type_id as ServiceType,
    per_visit_rate: row.per_visit_rate ?? null,
    monthly_rate:   row.monthly_rate ?? null,
    home_size:      null,
    family_size:    null,
    meals_count:    null,
  }))

  // If the DB says 'pending' but the worker has uploaded docs, show 'submitted'
  // so the UI can distinguish "hasn't started" (red) from "under review" (yellow).
  const hasDoc = !!(kycDoc?.aadhaar_url || kycDoc?.photo_url)
  const derivedStatus =
    provider.kyc_status === 'pending' && hasDoc ? 'submitted' : provider.kyc_status

  return {
    ...(provider as ServiceProvider),
    kyc_status: derivedStatus,
    services,
    availability_slots: (avail?.shifts ?? provider.availability_slots ?? []) as AvailabilitySlot[],
  }
}

export async function createProviderProfile(
  userId: string,
  input: CreateProviderInput
): Promise<ProviderWithServices> {
  // Idempotent: if a row already exists for this user (accidental resubmit),
  // update it instead of creating a duplicate. UNIQUE constraint on user_id
  // enforces this at the DB level too.
  const { data: provider, error } = await supabase
    .from('service_providers')
    .upsert({
      user_id:            userId,
      society_id:         input.societyId,
      availability_slots: input.availabilitySlots,
      kyc_status:         'pending',
      availability:       true,
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error || !provider) throw new Error(error?.message ?? 'Failed to create provider')

  const insertedServices = await replaceProviderServices(provider.id, input.services)
  await supabase.from('users').update({ society_id: input.societyId }).eq('id', userId)

  // Don't depend on a re-fetch (PostgREST schema cache can be stale right after
  // we INSERT into a freshly-altered table). Compose the result from what we
  // already have in hand.
  return { ...(provider as ServiceProvider), services: insertedServices }
}

export async function updateProviderProfile(
  id: string,
  input: UpdateProviderInput
): Promise<ProviderService[] | undefined> {
  if (input.availabilitySlots !== undefined) {
    const { error } = await supabase
      .from('service_providers')
      .update({ availability_slots: input.availabilitySlots })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  if (input.services !== undefined) {
    return await replaceProviderServices(id, input.services)
  }
  return undefined
}

export async function setProviderAvailability(id: string, available: boolean): Promise<void> {
  const { error } = await supabase
    .from('service_providers')
    .update({ availability: available })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ─── Internals ────────────────────────────────────────────────────────────────

// Replace all services in one shot — simpler than diffing, fine at our scale
// (a provider offers a handful of services, not thousands).
// Returns the freshly inserted rows so callers don't need a separate re-fetch.
async function replaceProviderServices(
  providerId: string,
  services: ServiceOfferingInput[]
): Promise<ProviderService[]> {
  const { error: delError } = await supabase
    .from('provider_services')
    .delete()
    .eq('provider_id', providerId)
  if (delError) throw new Error(delError.message)

  if (services.length === 0) return []

  const rows = services.map((s) => ({
    provider_id:    providerId,
    service_type:   s.serviceType,
    per_visit_rate: s.perVisitRate,
    monthly_rate:   s.monthlyRate,
  }))

  const { data, error: insError } = await supabase
    .from('provider_services')
    .insert(rows)
    .select()
  if (insError) throw new Error(insError.message)
  return (data ?? []) as ProviderService[]
}
