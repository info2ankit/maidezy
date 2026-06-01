import { getToken, onMessage, type Messaging } from 'firebase/messaging'
import { getMessagingSafe, FCM_VAPID_KEY } from './firebase'
import { upsertPushSubscription, deletePushSubscription } from '@/shared/services/pushSubscriptionService'

/**
 * Result of a permission request.
 */
export type PushPermissionResult =
  | { status: 'granted'; token: string }
  | { status: 'denied' }
  | { status: 'default' }                  // user dismissed the prompt
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; error: string }

/**
 * Waits until the SW registration has an active worker.
 * `getToken()` calls PushManager.subscribe() which requires an active SW —
 * if the SW is still installing/waiting the call throws "no active Service Worker".
 */
function waitForActive(reg: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (reg.active) return Promise.resolve(reg)
  return new Promise((resolve) => {
    const worker = reg.installing ?? reg.waiting
    if (!worker) { resolve(reg); return }
    const onStateChange = () => {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', onStateChange)
        resolve(reg)
      }
    }
    worker.addEventListener('statechange', onStateChange)
  })
}

/**
 * Registers the FCM service worker at a dedicated scope so it doesn't fight
 * with vite-plugin-pwa's workbox SW (which owns the root scope).
 */
async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    // Find an existing FCM SW registration by script URL, not by scope.
    // getRegistration(url) returns whichever SW scope covers that URL —
    // which would be the vite-pwa workbox SW (scope '/'), not the FCM SW.
    const regs = await navigator.serviceWorker.getRegistrations()
    const existing = regs.find((r) =>
      [r.active, r.installing, r.waiting].some((w) =>
        w?.scriptURL.includes('firebase-messaging-sw'),
      ),
    )
    if (existing) return waitForActive(existing)
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    })
    return waitForActive(reg)
  } catch (err) {
    console.warn('[push] failed to register FCM SW', err)
    return null
  }
}

/**
 * Asks the browser for notification permission and, if granted, fetches an
 * FCM token and persists it as a push subscription for the given user.
 *
 * Safe to call multiple times — duplicate tokens are upserted (uq on `token`).
 */
export async function requestPushPermission(userId: string): Promise<PushPermissionResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { status: 'unsupported', reason: 'Notifications API not available in this browser' }
  }
  if (!FCM_VAPID_KEY) {
    return { status: 'unsupported', reason: 'VITE_FIREBASE_VAPID_KEY is not configured' }
  }

  const messaging = await getMessagingSafe()
  if (!messaging) {
    return { status: 'unsupported', reason: 'Firebase Messaging is not supported in this browser' }
  }

  let permission: NotificationPermission
  try {
    permission = await Notification.requestPermission()
  } catch (err) {
    return { status: 'error', error: (err as Error).message }
  }

  if (permission === 'denied')  return { status: 'denied' }
  if (permission !== 'granted') return { status: 'default' }

  // Permission granted — get the FCM token and persist it.
  const swReg = await registerFcmServiceWorker()
  try {
    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: swReg ?? undefined,
    })
    if (!token) {
      return { status: 'error', error: 'Failed to obtain FCM token' }
    }

    await upsertPushSubscription({
      userId,
      token,
      platform:  'web',
      userAgent: navigator.userAgent,
    })

    return { status: 'granted', token }
  } catch (err) {
    return { status: 'error', error: (err as Error).message }
  }
}

/**
 * Revoke this device's subscription (e.g. on logout). Best-effort: clears
 * the row from the DB and the local SW registration.
 */
export async function unsubscribeThisDevice(token: string | null): Promise<void> {
  if (token) {
    await deletePushSubscription(token).catch((e) => console.warn('[push] delete failed', e))
  }
}

/**
 * Silently re-registers this device's FCM token for the given user.
 * Call on every login: if the same device was previously used by another user,
 * this re-binds the token (via upsert) to the current user so they receive
 * the right notifications.
 * No-op if permission is not 'granted'.
 */
export async function autoRegisterPush(userId: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (!FCM_VAPID_KEY) return
  const messaging = await getMessagingSafe()
  if (!messaging) return
  try {
    const swReg = await registerFcmServiceWorker()
    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: swReg ?? undefined,
    })
    if (token) {
      await upsertPushSubscription({ userId, token, platform: 'web', userAgent: navigator.userAgent })
    }
  } catch (e) {
    console.warn('[push] autoRegisterPush failed', e)
  }
}

/**
 * Soft-deletes this device's push subscription at logout time so the old user
 * stops receiving notifications on this device after they log out.
 * No-op if permission is not 'granted'.
 */
export async function unsubscribeCurrentDevice(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (!FCM_VAPID_KEY) return
  const messaging = await getMessagingSafe()
  if (!messaging) return
  try {
    const swReg = await registerFcmServiceWorker()
    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: swReg ?? undefined,
    })
    if (token) await unsubscribeThisDevice(token)
  } catch (e) {
    console.warn('[push] unsubscribeCurrentDevice failed', e)
  }
}

/**
 * Subscribes to FOREGROUND messages (push events that arrive while the app
 * is open). Returns an unsubscribe function. The caller decides how to
 * render — a toast, an in-app banner, etc.
 *
 * Background pushes are handled by public/firebase-messaging-sw.js.
 */
export function onForegroundMessage(
  handler: (payload: { title: string; body: string; link?: string }) => void,
): () => void {
  let cleanup = () => {}
  void (async () => {
    const messaging = await getMessagingSafe()
    if (!messaging) return
    cleanup = subscribeForeground(messaging, handler)
  })()
  return () => cleanup()
}

function subscribeForeground(
  messaging: Messaging,
  handler: (payload: { title: string; body: string; link?: string }) => void,
): () => void {
  return onMessage(messaging, (payload) => {
    handler({
      title: payload.notification?.title ?? 'MaidEzy',
      body:  payload.notification?.body  ?? '',
      link:  (payload.data as Record<string, string> | undefined)?.link,
    })
  })
}
