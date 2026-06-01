import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bug, BellRinging, X, SpinnerGap, CheckCircle, XCircle, WarningCircle } from '@phosphor-icons/react'
import { useAuthStore } from '@/shared/stores/authStore'
import { requestPushPermission } from '@/lib/push'
import { fetchPushSubscriptionsForUser } from '@/shared/services/pushSubscriptionService'
import { sendPush } from '@/shared/services/notificationService'

/**
 * Floating Bug button that opens a developer-only push diagnostic panel.
 *
 * Shows:
 *   - browser support flags
 *   - Notification.permission state
 *   - whether the FCM SW is registered
 *   - how many push_subscriptions rows the current user has
 *   - one-tap "send test push" that hits the edge function
 *
 * The button is intentionally tiny + floating so it doesn't pollute the
 * main UI. Gate via VITE_APP_ENV=development if you want to hide in prod.
 */
export default function PushDebugPanel() {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)

  if (!user?.id) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open push debug"
        className="fixed bottom-24 right-4 z-40 w-11 h-11 rounded-full bg-gray-900/85 backdrop-blur-sm text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform md:bottom-6"
      >
        <Bug size={18} weight="fill" />
      </button>

      <AnimatePresence>
        {open && <PushDebugSheet userId={user.id} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

interface CheckResult {
  label:  string
  status: 'ok' | 'warn' | 'fail' | 'info'
  value:  string
}

function PushDebugSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [busy, setBusy] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { runChecks() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [])

  async function runChecks() {
    setBusy(true)
    setError(null)
    const out: CheckResult[] = []

    out.push({
      label: 'iOS version',
      status: detectIosVersion() === 'unsupported' ? 'fail' : 'info',
      value: detectIosVersion(),
    })

    out.push({
      label: 'Notification API',
      status: 'Notification' in window ? 'ok' : 'fail',
      value: 'Notification' in window ? 'available' : 'NOT available — browser too old',
    })

    if ('Notification' in window) {
      const p = Notification.permission
      out.push({
        label: 'Permission',
        status: p === 'granted' ? 'ok' : p === 'denied' ? 'fail' : 'warn',
        value: p,
      })
    }

    out.push({
      label: 'Service workers',
      status: 'serviceWorker' in navigator ? 'ok' : 'fail',
      value: 'serviceWorker' in navigator ? 'supported' : 'NOT supported',
    })

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      const fcmReg = regs.find((r) => r.active?.scriptURL.includes('firebase-messaging-sw'))
      out.push({
        label: 'FCM SW registered',
        status: fcmReg ? 'ok' : 'fail',
        value: fcmReg
          ? `scope: ${fcmReg.scope}`
          : `none (${regs.length} other SW${regs.length === 1 ? '' : 's'} active)`,
      })
    }

    const standalone = isStandalone()
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    out.push({
      label: 'Standalone (PWA)',
      status: standalone || !isIos ? 'ok' : 'warn',
      value: standalone
        ? 'running as installed PWA'
        : isIos
          ? 'running in browser — iOS requires PWA install'
          : 'running in browser (OK on desktop/Android)',
    })

    out.push({
      label: 'HTTPS',
      status: location.protocol === 'https:' || location.hostname === 'localhost' ? 'ok' : 'fail',
      value: location.protocol,
    })

    out.push({
      label: 'VAPID key configured',
      status: import.meta.env.VITE_FIREBASE_VAPID_KEY ? 'ok' : 'fail',
      value: import.meta.env.VITE_FIREBASE_VAPID_KEY ? 'yes' : 'MISSING — set VITE_FIREBASE_VAPID_KEY',
    })

    try {
      const subs = await fetchPushSubscriptionsForUser(userId)
      out.push({
        label: 'Saved push tokens (this user)',
        status: subs.length > 0 ? 'ok' : 'fail',
        value: subs.length > 0
          ? `${subs.length} device${subs.length === 1 ? '' : 's'}`
          : 'none — opt-in didn\'t save a token',
      })
      if (subs.length > 0) {
        const first = subs[0].token
        out.push({
          label: 'Latest token (first 24 chars)',
          status: 'info',
          value: first.slice(0, 24) + '…',
        })
      }
    } catch (e) {
      out.push({
        label: 'Saved push tokens (this user)',
        status: 'fail',
        value: `query failed: ${(e as Error).message}`,
      })
    }

    setChecks(out)
    setBusy(false)
  }

  async function handleOptIn() {
    setBusy(true); setError(null)
    const r = await requestPushPermission(userId)
    setBusy(false)
    if (r.status === 'granted') await runChecks()
    else if (r.status === 'error') setError(r.error)
    else if (r.status === 'unsupported') setError(r.reason)
    else if (r.status === 'denied') setError('Permission denied. Re-enable in browser/iOS Settings.')
  }

  async function handleTestPush() {
    setBusy(true); setTestResult(null); setError(null)
    try {
      await sendPush({
        userId,
        title: 'MaidEzy test push',
        body:  'If you see this on your phone, push is working ✓',
        link:  '/',
        tag:   `debug-${Date.now()}`,
      })
      setTestResult('Edge function returned OK. Check your phone — push should arrive within ~10s. If not, the token may be stale (uninstall + reinstall the PWA) or FCM may have rejected it.')
    } catch (e) {
      setError(`Edge function error: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bug size={18} weight="duotone" className="text-primary" />
            <h2 className="font-heading font-bold text-gray-800">Push diagnostics</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={14} weight="bold" className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2.5 py-1.5">
              <StatusDot status={c.status} />
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-semibold text-gray-700">{c.label}</p>
                <p className="font-body text-xs text-gray-500 break-words">{c.value}</p>
              </div>
            </div>
          ))}

          {testResult && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs font-body text-blue-900">
              {testResult}
            </div>
          )}
          {error && (
            <div className="mt-4 bg-danger-light border border-danger/20 rounded-xl px-3 py-2.5 text-xs font-body text-danger-dark">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex gap-2">
          <button
            type="button"
            onClick={handleOptIn}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-body font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {busy && <SpinnerGap size={13} weight="bold" className="animate-spin" />}
            Re-opt-in
          </button>
          <button
            type="button"
            onClick={handleTestPush}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-body font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {busy ? <SpinnerGap size={13} weight="bold" className="animate-spin" /> : <BellRinging size={13} weight="bold" />}
            Send test push
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatusDot({ status }: { status: CheckResult['status'] }) {
  if (status === 'ok')   return <CheckCircle  size={14} weight="fill" className="text-success mt-0.5 shrink-0" />
  if (status === 'fail') return <XCircle      size={14} weight="fill" className="text-danger mt-0.5 shrink-0" />
  if (status === 'warn') return <WarningCircle size={14} weight="fill" className="text-amber-500 mt-0.5 shrink-0" />
  return <span className="w-3.5 h-3.5 rounded-full bg-gray-300 mt-0.5 shrink-0" />
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mql = window.matchMedia?.('(display-mode: standalone)')
  if (mql?.matches) return true
  // iOS Safari: navigator.standalone is non-standard but works
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((navigator as any).standalone)
}

function detectIosVersion(): string {
  const ua = navigator.userAgent
  const m = ua.match(/OS (\d+)_(\d+)/)
  if (!m) return 'not iOS (or unknown)'
  const major = Number(m[1])
  const minor = Number(m[2])
  if (major < 16 || (major === 16 && minor < 4)) return 'unsupported'
  return `iOS ${major}.${minor}`
}
