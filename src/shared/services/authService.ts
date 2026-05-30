import { RecaptchaVerifier, signInWithPhoneNumber, signOut as firebaseSignOut } from 'firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'
import type { User, Role } from '@/shared/types'

type SignupRole = Extract<Role, 'resident' | 'service_provider'>

// ─── Module-level state ───────────────────────────────────────────────────────
// Kept here so sendOtp and verifyOtp share state without prop-drilling.

let pendingConfirmation: ConfirmationResult | null = null
let recaptchaVerifier:   RecaptchaVerifier  | null = null

// ─── reCAPTCHA ────────────────────────────────────────────────────────────────
// Invisible reCAPTCHA is required by Firebase Phone Auth (web).
// It attaches to document.body so no special div is needed in the UI.

function getRecaptchaVerifier(): RecaptchaVerifier {
  if (!recaptchaVerifier) {
    const container = document.getElementById('recaptcha-container')!
    recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, container, {
      size: 'invisible',
    })
  }
  return recaptchaVerifier
}

function resetRecaptchaVerifier() {
  try { recaptchaVerifier?.clear() } catch (_) { /* ignore */ }
  recaptchaVerifier = null
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendOtp(mobile: string): Promise<{ error?: string }> {
  resetRecaptchaVerifier()
  try {
    const verifier = getRecaptchaVerifier()
    pendingConfirmation = await signInWithPhoneNumber(firebaseAuth, `+91${mobile}`, verifier)
    return {}
  } catch (e: unknown) {
    resetRecaptchaVerifier()
    return { error: (e as Error).message ?? 'Failed to send OTP. Check Firebase setup.' }
  }
}

export async function verifyOtp(
  mobile:     string,
  token:      string,
  signupRole: SignupRole = 'resident',
): Promise<{ user?: User; error?: string }> {
  if (!pendingConfirmation) {
    return { error: 'Session expired. Please request a new OTP.' }
  }

  try {
    const result     = await pendingConfirmation.confirm(token)
    const firebaseUid = result.user.uid
    pendingConfirmation = null

    // Each (mobile, role) pair gets its OWN Supabase auth identity so the same
    // phone can sign in independently as Resident and as Worker. Firebase UID
    // is stable per phone but role is part of the email, giving us two distinct
    // accounts that happen to share a password.
    const email    = authEmailFor(mobile, signupRole)
    const password = firebaseUid

    let authId: string

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (!signInError && signInData.user) {
      authId = signInData.user.id
    } else {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError || !signUpData.user) {
        return { error: signUpError?.message ?? 'Account creation failed' }
      }
      authId = signUpData.user.id
    }

    const user = await resolveProfileByMobileAndRole(authId, mobile, signupRole)
    return { user }
  } catch (e: unknown) {
    const msg = (e as Error).message ?? 'OTP verification failed'
    if (msg.includes('invalid-verification-code')) return { error: 'Incorrect OTP. Please try again.' }
    if (msg.includes('code-expired'))              return { error: 'OTP expired. Please request a new one.' }
    return { error: msg }
  }
}

type AdminRole = 'super_admin' | 'worker_admin'
const ADMIN_ROLES: AdminRole[] = ['super_admin', 'worker_admin']

/** Admin OTP verification. Same Firebase phone flow as residents/workers, but
 *  the Supabase auth identity is namespaced with '-admin' so it doesn't collide
 *  with a resident or worker account on the same number. */
export async function verifyAdminOtp(
  mobile: string,
  token:  string,
): Promise<{ user?: User; error?: string }> {
  if (!pendingConfirmation) {
    return { error: 'Session expired. Please request a new OTP.' }
  }

  try {
    const result      = await pendingConfirmation.confirm(token)
    const firebaseUid = result.user.uid
    pendingConfirmation = null

    // Look up the admin profile FIRST — before creating any auth identity.
    // If this mobile isn't an admin we don't want to leave a stray auth row.
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', mobile)
      .in('role', ADMIN_ROLES)
      .maybeSingle()

    if (!profile) {
      return {
        error:
          'No admin account is registered for this mobile number. ' +
          'Ask the Super Admin to add you (public.users with role super_admin or worker_admin).',
      }
    }

    // Admin-namespaced Supabase auth identity. Keeps the session distinct from
    // any resident/worker accounts the same person may also have.
    const email    = `${mobile}-admin@firebase.maidezy.app`
    const password = firebaseUid

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !signInData.user) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError || !signUpData.user) {
        return { error: signUpError?.message ?? 'Admin auth failed' }
      }
    }

    return { user: profile as User }
  } catch (e: unknown) {
    const msg = (e as Error).message ?? 'OTP verification failed'
    if (msg.includes('invalid-verification-code')) return { error: 'Incorrect OTP. Please try again.' }
    if (msg.includes('code-expired'))              return { error: 'OTP expired. Please request a new one.' }
    return { error: msg }
  }
}

/** Returns RWA-admin society memberships for the given user, or empty list. */
export async function fetchRwaAdminMembership(
  userId: string,
): Promise<{ isRwaAdmin: boolean; societyIds: string[] }> {
  const { data } = await supabase
    .from('rwa_admins')
    .select('society_id')
    .eq('user_id', userId)

  const societyIds = (data ?? [])
    .map((r) => r.society_id as string)
    .filter((id): id is string => !!id)

  return { isRwaAdmin: societyIds.length > 0, societyIds }
}

export async function signOut(): Promise<void> {
  await Promise.all([
    supabase.auth.signOut(),
    firebaseSignOut(firebaseAuth),
  ])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the Supabase auth email for a (mobile, role) pair. Same phone gets
 *  a distinct auth identity per role, so resident-me and worker-me are isolated. */
function authEmailFor(mobile: string, role: SignupRole): string {
  return `${mobile}-${role}@firebase.maidezy.app`
}

async function resolveProfileByMobileAndRole(
  authId:     string,
  mobile:     string,
  signupRole: SignupRole,
): Promise<User> {
  // 1. Existing profile for this (mobile, role)?
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('mobile', mobile)
    .eq('role', signupRole)
    .maybeSingle()

  if (existing) {
    // Same rationale as before: don't overwrite stored id with authId. Child
    // tables FK against the stored id; sync_user_auth_id is a documented no-op
    // until the FK rotation work lands (see migration 008 comment).
    if (existing.id !== authId) {
      await supabase.rpc('sync_user_auth_id', { p_mobile: mobile, p_new_id: authId })
    }
    return existing as User
  }

  // 2. Create the profile for the chosen role.
  const { data: created, error } = await supabase
    .from('users')
    .insert({ id: authId, mobile, role: signupRole, is_active: true })
    .select()
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Failed to create user profile')
  }
  return created as User
}
