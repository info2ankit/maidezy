import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRinging, X, SpinnerGap, CheckCircle } from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import { requestPushPermission } from '@/lib/push'
import { SPRING } from '@/shared/utils/motion'

const DISMISS_KEY = 'maidezy_push_optin_dismissed_at'
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7   // 7 days

/**
 * One-time banner asking the user to enable push notifications.
 *
 * Shows only when:
 *   - the user is signed in
 *   - the browser supports Notification API
 *   - Notification.permission === 'default' (user hasn't decided)
 *   - the user hasn't dismissed within the past 7 days
 *
 * Granting persists the FCM token to push_subscriptions and the banner
 * disappears for good on this device. Denial / dismiss hides it for
 * DISMISS_TTL_MS.
 */
export default function PushOptInBanner() {
  const user = useAuthStore((s) => s.user)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [justGranted, setJustGranted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) { setShow(false); return }
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'default') return

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? '0')
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return

    setShow(true)
  }, [user?.id])

  if (!show || !user?.id) return null

  async function handleEnable() {
    if (!user?.id) return
    setBusy(true)
    setError(null)
    const res = await requestPushPermission(user.id)
    setBusy(false)
    if (res.status === 'granted') {
      setJustGranted(true)
      window.setTimeout(() => setShow(false), 1800)
    } else if (res.status === 'denied') {
      // Browser-level denial — don't ask again, user can re-enable from browser settings.
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_TTL_MS * 52))
      setShow(false)
    } else if (res.status === 'error') {
      setError(res.error)
    } else if (res.status === 'unsupported') {
      // Hide for a long time — not actionable.
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_TTL_MS * 52))
      setShow(false)
    }
    // 'default' (dismissed via OS) — leave banner visible so they can retry
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={SPRING}
          className="mx-4 mt-3 md:mx-8 md:mt-4 bg-gradient-to-r from-primary to-[#2a4f7a] text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            {justGranted
              ? <CheckCircle size={20} weight="fill" className="text-emerald-300" />
              : <BellRinging size={20} weight="duotone" className="text-white" />
            }
          </div>
          <div className="flex-1 min-w-0">
            {justGranted ? (
              <>
                <p className="font-body font-bold text-sm">Notifications enabled</p>
                <p className="font-body text-xs text-white/80 mt-0.5">You'll get updates even when the app is closed.</p>
              </>
            ) : (
              <>
                <p className="font-body font-bold text-sm">Enable notifications</p>
                <p className="font-body text-xs text-white/80 mt-0.5">
                  {error ?? "We'll only ping you for bookings and important updates."}
                </p>
              </>
            )}
          </div>
          {!justGranted && (
            <>
              <button
                type="button"
                onClick={handleEnable}
                disabled={busy}
                className="shrink-0 inline-flex items-center gap-1.5 bg-white text-primary font-body font-semibold text-xs rounded-full px-3 py-1.5 hover:bg-white/90 disabled:opacity-60 transition-colors"
              >
                {busy ? <SpinnerGap size={12} weight="bold" className="animate-spin" /> : <BellRinging size={12} weight="bold" />}
                Enable
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={12} weight="bold" className="text-white" />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
