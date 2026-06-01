/* eslint-disable no-undef, no-restricted-globals */
// MaidEzy — Firebase Cloud Messaging service worker
//
// Handles push notifications when the app is in the background or closed.
// Foreground messages are handled by src/lib/push.ts via onMessage().
//
// IMPORTANT: this file is loaded by the browser as a standalone script at
// /firebase-messaging-sw.js. It cannot use ES module imports or .env vars.
// Config values are inlined verbatim; treat as PUBLIC (same security model
// as the web SDK config).

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

// Keep this in sync with .env / src/lib/firebase.ts.
firebase.initializeApp({
  apiKey:            'AIzaSyBxEptZlDO1R-TYwpqwxh0ux4yL_D096-A',
  authDomain:        'maidezy-2026.firebaseapp.com',
  projectId:         'maidezy-2026',
  messagingSenderId: '495821556085',
  appId:             '1:495821556085:web:4d9ed29a58c5a55b952b3c',
})

const messaging = firebase.messaging()

// Background message handler. The browser auto-renders a system
// notification from `payload.notification`; we only need to override
// when we want custom data (e.g. add an action URL via `data.link`).
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'MaidEzy'
  const body  = payload.notification?.body  || ''
  const link  = payload.data?.link || '/'

  self.registration.showNotification(title, {
    body,
    icon:  '/icon.svg',
    badge: '/icon.svg',
    data:  { link },
    tag:   payload.data?.tag || undefined,  // collapse duplicates
  })
})

// Click handler: route the user to the deep link if provided.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link || '/'
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clients) {
      if ('focus' in client) {
        await client.navigate(link).catch(() => {})
        return client.focus()
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(link)
  })())
})
