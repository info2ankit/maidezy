import { RecaptchaVerifier, signInWithPhoneNumber, signOut as firebaseSignOut } from 'firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'
import { firebaseAuth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'
import { createNotification } from './notificationService'
import { unsubscribeCurrentDevice } from '@/lib/push'
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
    let isFirstLogin = false
    let supabaseAuthId: string

    if (signInError || !signInData.user) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError || !signUpData.user) {
        return { error: signUpError?.message ?? 'Admin auth failed' }
      }
      // signUp succeeded where signIn failed → this is the user's first time
      // accepting their invite. Worth notifying the super admins.
      isFirstLogin = true
      supabaseAuthId = signUpData.user.id
    } else {
      supabaseAuthId = signInData.user.id
    }

    // Link the Supabase auth UID to the public.users row so session
    // restore (App.tsx) and the audit trigger can resolve the actor.
    // Admin auth identities use a synthetic email and get a different
    // auth.uid() from the pre-created public.users.id.
    await supabase
      .from('users')
      .update({ auth_id: supabaseAuthId })
      .eq('id', profile.id)

    if (isFirstLogin && (profile.role === 'worker_admin' || profile.role === 'rwa_admin')) {
      // Fire-and-forget so a notification hiccup doesn't break login.
      const acceptedRole = profile.role
      notifySuperAdminsOfAdminAccepted(
        (profile as User).id,
        acceptedRole,
        (profile as User).name ?? mobile,
      ).catch((e: unknown) => console.warn('notify super admins of invite acceptance failed', e))
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
  // Best-effort: soft-delete this device's push token before clearing the session
  // so the signed-out user stops receiving notifications on this device.
  await unsubscribeCurrentDevice().catch(() => {})
  await Promise.all([
    supabase.auth.signOut(),
    firebaseSignOut(firebaseAuth),
  ])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Notifies all active super admins when a Worker Admin / RWA Admin completes
 * their first login (i.e. accepts the invite created for them). Best-effort.
 */
async function notifySuperAdminsOfAdminAccepted(
  newAdminId:   string,
  newAdminRole: 'worker_admin' | 'rwa_admin',
  displayName:  string,
): Promise<void> {
  const { data: supers } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'super_admin')
    .eq('is_active', true)

  if (!supers || supers.length === 0) return

  const roleLabel = newAdminRole === 'worker_admin' ? 'Worker Admin' : 'RWA Admin'
  await Promise.allSettled(
    supers.map((s) =>
      createNotification({
        userId: s.id as string,
        type:   'system',
        title:  `${roleLabel} joined`,
        body:   `${displayName} just signed in for the first time and is now active.`,
        link:   newAdminRole === 'worker_admin'
          ? '/super-admin/worker-admins'
          : '/super-admin/admins',
        tag:    `admin-accepted-${newAdminId}`,
      }),
    ),
  )
}

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
    // When the pre-created public.users.id differs from the Supabase auth UID,
    // store the auth UID in auth_id so RLS policies (bs_worker, wav_self, etc.)
    // can resolve "auth.uid() → users.id" without rotating FK references.
    if (existing.id !== authId) {
      await supabase
        .from('users')
        .update({ auth_id: authId })
        .eq('id', existing.id)
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
