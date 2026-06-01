// MaidEzy — send-push edge function (Supabase / Deno)
//
// Receives an event from the application, looks up the recipient's FCM
// tokens in push_subscriptions, and sends a push via the FCM HTTP v1 API.
//
// SETUP (one-time)
// ────────────────────────────────────────────────────────────────────
// 1. Firebase Console → Project Settings → Service Accounts →
//    "Generate new private key". Copy the JSON file contents.
//
// 2. Set as a Supabase secret (raw JSON, on one line):
//      supabase secrets set FCM_SERVICE_ACCOUNT_JSON='<paste here>'
//
// 3. Deploy:
//      supabase functions deploy send-push
//
// INVOKE (from app code)
// ────────────────────────────────────────────────────────────────────
//   supabase.functions.invoke('send-push', {
//     body: { userId, title, body, link, tag? }
//   })
//
// Failed tokens (NOT_REGISTERED / INVALID_ARGUMENT) are soft-deleted
// from push_subscriptions so we stop trying.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

// ─── Types ──────────────────────────────────────────────────────────

interface SendPushRequest {
  userId: string
  title:  string
  body:   string
  link?:  string
  tag?:   string         // collapse duplicates (e.g. one toast per booking)
}

interface ServiceAccount {
  client_email: string
  private_key:  string
  project_id:   string
}

interface PushSubscriptionRow {
  id:    string
  token: string
}

interface SendResult {
  sent:    number
  failed:  number
  pruned:  number        // tokens we soft-deleted
}

// ─── Service account helpers ────────────────────────────────────────

let serviceAccount: ServiceAccount | null = null
function getServiceAccount(): ServiceAccount {
  if (serviceAccount) return serviceAccount
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')
  if (!raw) throw new Error('FCM_SERVICE_ACCOUNT_JSON secret is not set')
  try {
    serviceAccount = JSON.parse(raw) as ServiceAccount
    if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
      throw new Error('Service account JSON is missing required fields')
    }
    return serviceAccount
  } catch (e) {
    throw new Error(`Failed to parse FCM_SERVICE_ACCOUNT_JSON: ${(e as Error).message}`)
  }
}

// ─── OAuth2 access token (for FCM HTTP v1) ──────────────────────────
//
// We exchange a self-signed JWT for an OAuth2 access token, cached in
// memory until ~5 min before expiry. Edge function warm starts reuse it.

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value

  // Build the assertion JWT (signed with the service-account private key)
  const header = { alg: 'RS256' as const, typ: 'JWT' }
  const payload = {
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   getNumericDate(60 * 60),   // 1h
  }

  const pkCryptoKey = await importPrivateKey(sa.private_key)
  const assertion = await create(header, payload, pkCryptoKey)

  // Exchange JWT for access token
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!resp.ok) {
    const t = await resp.text()
    throw new Error(`OAuth2 token exchange failed (${resp.status}): ${t}`)
  }
  const json = await resp.json() as { access_token: string; expires_in: number }
  cachedToken = { value: json.access_token, expiresAt: now + json.expires_in }
  return cachedToken.value
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\\n/g, '\n')
    .replace(/\s+/g, '')
  const binary = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0))
  return await crypto.subtle.importKey(
    'pkcs8',
    binary.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

// ─── FCM send ───────────────────────────────────────────────────────

async function sendToToken(
  accessToken: string,
  projectId:   string,
  token:       string,
  msg:         SendPushRequest,
): Promise<{ ok: boolean; prune: boolean; error?: string }> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
  const data: Record<string, string> = {}
  if (msg.link) data.link = msg.link
  if (msg.tag)  data.tag  = msg.tag

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${accessToken}`,
      'content-type':  'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: msg.title, body: msg.body },
        data,
        webpush: {
          fcm_options: msg.link ? { link: msg.link } : undefined,
        },
      },
    }),
  })

  if (resp.ok) return { ok: true, prune: false }

  const errText = await resp.text()
  // Tokens that are unregistered or malformed should be pruned.
  const prune =
    /UNREGISTERED|INVALID_ARGUMENT|NOT_REGISTERED/i.test(errText) ||
    resp.status === 404
  return { ok: false, prune, error: `${resp.status} ${errText.slice(0, 300)}` }
}

// ─── Handler ────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'access-control-allow-origin':  '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  let payload: SendPushRequest
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }
  if (!payload.userId || !payload.title || !payload.body) {
    return new Response(JSON.stringify({ error: 'userId, title, body are required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }

  // Service-role client to read subscriptions and prune stale tokens
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // Fetch live tokens for this user
  const { data: subs, error: subsErr } = await supabase
    .from('push_subscriptions')
    .select('id, token')
    .eq('user_id', payload.userId)
    .is('deleted_at', null)
  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }
  const subscriptions = (subs ?? []) as PushSubscriptionRow[]
  if (subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0, failed: 0, pruned: 0 } satisfies SendResult), {
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }

  let sa: ServiceAccount
  let accessToken: string
  try {
    sa          = getServiceAccount()
    accessToken = await getAccessToken(sa)
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }

  // Fan out
  const results = await Promise.all(
    subscriptions.map((sub) =>
      sendToToken(accessToken, sa.project_id, sub.token, payload)
        .then((r) => ({ sub, ...r })),
    ),
  )

  const summary: SendResult = { sent: 0, failed: 0, pruned: 0 }
  const toPrune: string[] = []
  for (const r of results) {
    if (r.ok) summary.sent++
    else {
      summary.failed++
      if (r.prune) toPrune.push(r.sub.id)
    }
  }

  if (toPrune.length > 0) {
    const { error: pruneErr } = await supabase
      .from('push_subscriptions')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', toPrune)
    if (!pruneErr) summary.pruned = toPrune.length
  }

  return new Response(JSON.stringify(summary), {
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
})
