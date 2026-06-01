import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getMessaging, isSupported as isMessagingSupported, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseApp  = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)

/**
 * Returns the Firebase Messaging instance, or null in environments that
 * don't support push (Safari ITP, private browsing, http://, server-side).
 * Use this rather than `getMessaging()` directly so callers don't crash
 * on unsupported runtimes.
 */
let _messagingPromise: Promise<Messaging | null> | null = null
export function getMessagingSafe(): Promise<Messaging | null> {
  if (_messagingPromise) return _messagingPromise
  _messagingPromise = (async () => {
    try {
      const ok = await isMessagingSupported()
      return ok ? getMessaging(firebaseApp) : null
    } catch {
      return null
    }
  })()
  return _messagingPromise
}

/** Public VAPID key from Firebase Console → Cloud Messaging → Web Push certificates. */
export const FCM_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
