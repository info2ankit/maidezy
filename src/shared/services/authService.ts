import { supabase } from '@/lib/supabase'
import type { User } from '@/shared/types'

// ─── Bypass mode ──────────────────────────────────────────────────────────────
// When VITE_APP_ENV=development:
//   - No SMS is sent. Any 6-digit code is accepted.
//   - Uses Supabase Anonymous Sign-in (no email or phone provider needed).
//   - REQUIRED: Enable "Anonymous Sign Ins" in Supabase → Auth → Providers.
//
// To switch to production SMS (MSG91 / Fast2SMS via Supabase Phone):
//   1. Set VITE_APP_ENV=production in .env.local
//   2. Enable Phone provider in Supabase Auth with your SMS provider keys
// ─────────────────────────────────────────────────────────────────────────────

const isBypassMode = import.meta.env.VITE_APP_ENV !== 'production'

export async function sendOtp(mobile: string): Promise<{ error?: string }> {
  if (isBypassMode) {
    await new Promise((r) => setTimeout(r, 800)) // simulate network latency
    return {}
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: `+91${mobile}` })
  return error ? { error: error.message } : {}
}

export async function verifyOtp(
  mobile: string,
  token: string
): Promise<{ user?: User; error?: string }> {
  if (isBypassMode) {
    if (!/^\d{6}$/.test(token)) {
      return { error: 'Enter a valid 6-digit code' }
    }

    // Sign in anonymously — gives a valid Supabase session without any provider.
    // Each anonymous sign-in creates a new auth user, so we look up the profile
    // by mobile number and reuse it (updating the linked auth ID).
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously()

    if (anonError || !anonData.user) {
      return { error: anonError?.message ?? 'Anonymous sign-in failed. Enable Anonymous Sign Ins in Supabase Auth.' }
    }

    const user = await resolveProfileByMobile(anonData.user.id, mobile)
    return { user }
  }

  // ── Production: real Supabase Phone OTP ──
  const { data, error } = await supabase.auth.verifyOtp({
    phone: `+91${mobile}`,
    token,
    type: 'sms',
  })

  if (error || !data.user) {
    return { error: error?.message ?? 'Verification failed' }
  }

  const user = await resolveProfileByMobile(data.user.id, mobile)
  return { user }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Looks up user by mobile number first (stable across anonymous sessions),
// then falls back to auth ID. Creates a new profile if neither exists.
async function resolveProfileByMobile(authId: string, mobile: string): Promise<User> {
  // 1. Check if a profile with this mobile already exists
  const { data: byMobile } = await supabase
    .from('users')
    .select('*')
    .eq('mobile', mobile)
    .maybeSingle()

  if (byMobile) return byMobile as User

  // 2. No existing mobile record — create fresh profile linked to this auth ID
  const { data: created, error } = await supabase
    .from('users')
    .insert({ id: authId, mobile, role: 'resident', is_active: true })
    .select()
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Failed to create user profile')
  }

  return created as User
}
