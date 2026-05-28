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

    // Use Firebase UID as the Supabase password.
    // Firebase UID is stable per phone number (issued only after OTP verification),
    // so the same phone always maps to the same Supabase account. This ensures
    // auth.uid() is stable across sessions, which is required for RLS to work.
    const email    = `${mobile}@firebase.maidezy.app`
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

    const user = await resolveProfileByMobile(authId, mobile, signupRole)
    return { user }
  } catch (e: unknown) {
    const msg = (e as Error).message ?? 'OTP verification failed'
    if (msg.includes('invalid-verification-code')) return { error: 'Incorrect OTP. Please try again.' }
    if (msg.includes('code-expired'))              return { error: 'OTP expired. Please request a new one.' }
    return { error: msg }
  }
}

export async function signOut(): Promise<void> {
  await Promise.all([
    supabase.auth.signOut(),
    firebaseSignOut(firebaseAuth),
  ])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveProfileByMobile(
  authId:     string,
  mobile:     string,
  signupRole: SignupRole,
): Promise<User> {
  // 1. Check if a profile with this mobile already exists
  const { data: byMobile } = await supabase
    .from('users')
    .select('*')
    .eq('mobile', mobile)
    .maybeSingle()

  if (byMobile) {
    // If the auth session ID differs from the stored ID (happens when switching
    // from anonymous to Firebase email auth), sync it via a SECURITY DEFINER
    // RPC so RLS policies that check auth.uid() = users.id keep working.
    if (byMobile.id !== authId) {
      await supabase.rpc('sync_user_auth_id', { p_mobile: mobile, p_new_id: authId })
    }
    return { ...byMobile, id: authId } as User
  }

  // 2. Check if super admin pre-created a Worker Admin invite for this mobile
  const { data: invite } = await supabase
    .from('worker_admin_invites')
    .select('*')
    .eq('mobile', mobile)
    .maybeSingle()

  const role = invite ? 'worker_admin' : signupRole
  const name = invite?.name ?? undefined

  // 3. Create the profile
  const { data: created, error } = await supabase
    .from('users')
    .insert({ id: authId, mobile, role, ...(name ? { name } : {}), is_active: true })
    .select()
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Failed to create user profile')
  }

  // 4. If invited as worker_admin — link gender + societies and clean up the invite
  if (invite) {
    await supabase
      .from('worker_admins')
      .upsert(
        { user_id: authId, gender: invite.gender, society_ids: invite.society_ids ?? [] },
        { onConflict: 'user_id' },
      )
    await supabase
      .from('worker_admin_invites')
      .delete()
      .eq('mobile', mobile)
  }

  return created as User
}
