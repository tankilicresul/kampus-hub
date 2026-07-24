/**
 * Supabase Edge Function: send-push
 *
 * Çalışma alanındaki kullanıcılara Web Push bildirimi gönderir.
 *
 * Payload (JSON body):
 *   workspace_id     string   - Bildirimin gönderileceği çalışma alanı ID'si
 *   title            string   - Bildirim başlığı
 *   body             string   - Bildirim içeriği
 *   url?             string   - Tıklandığında açılacak URL (varsayılan: '/')
 *   exclude_user_id? string   - Bu kullanıcıya gönderme (genellikle kendi eylemini yapan kişi)
 *   target_user_ids? string[] - Sadece bu kullanıcılara gönder (boşsa tüm workspace üyeleri)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── VAPID helpers (web-push benzeri saf Deno uygulaması) ──────────────────────

/** Base64url → Uint8Array */
function base64urlToBuffer(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Uint8Array → Base64url */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** VAPID JWT oluştur */
async function createVapidJwt(
  endpoint: string,
  privateKeyB64: string,
  email: string
): Promise<string> {
  const origin = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: origin,
    exp: now + 43200, // 12 saat
    sub: email,
  };

  const headerB64 = bufferToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = bufferToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sigInput = `${headerB64}.${payloadB64}`;

  // EC private key import
  const privKeyBytes = base64urlToBuffer(privateKeyB64);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    // Wrap raw 32-byte key in PKCS8 DER structure
    wrapEcPrivateKey(privKeyBytes),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(sigInput)
  );

  return `${sigInput}.${bufferToBase64url(signature)}`;
}

/** 32-byte raw EC private key'i PKCS8 DER yapısına sarar */
function wrapEcPrivateKey(rawKey: Uint8Array): ArrayBuffer {
  // PKCS8 prefix for P-256 EC key
  const prefix = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const result = new Uint8Array(prefix.length + rawKey.length);
  result.set(prefix);
  result.set(rawKey, prefix.length);
  return result.buffer;
}

/** Web Push payload şifrele (RFC 8291 — aesgcm128) */
async function encryptPayload(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
): Promise<{ ciphertext: ArrayBuffer; salt: Uint8Array; serverPublicKey: CryptoKey }> {
  const authBytes = base64urlToBuffer(subscription.keys.auth);
  const p256dhBytes = base64urlToBuffer(subscription.keys.p256dh);

  // Client public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dhBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Server ephemeral key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );

  // Shared ECDH secret
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    { name: 'HKDF' },
    false,
    ['deriveKey', 'deriveBits']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Server public key raw bytes
  const serverPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  // PRK
  const prkKey = await crypto.subtle.importKey('raw', authBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkInfo = concat(
    new TextEncoder().encode('Content-Encoding: auth\0'),
    p256dhBytes,
    serverPublicKeyBytes,
    authBytes
  );
  const prk = await crypto.subtle.sign('HMAC', prkKey, prkInfo);

  // CEK
  const prkImported = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const cekInfo = concat(new TextEncoder().encode('Content-Encoding: aesgcm128\0'), new Uint8Array(1));
  const cek = (await crypto.subtle.sign('HMAC', prkImported, cekInfo)).slice(0, 16);

  // Nonce
  const nonceInfo = concat(new TextEncoder().encode('Content-Encoding: nonce\0'), new Uint8Array(1));
  const nonce = (await crypto.subtle.sign('HMAC', prkImported, nonceInfo)).slice(0, 12);

  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const payloadBytes = new TextEncoder().encode(payload);
  // Add padding: 2-byte length + payload
  const padded = new Uint8Array(2 + payloadBytes.length);
  padded[0] = 0;
  padded[1] = 0;
  padded.set(payloadBytes, 2);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded);

  return { ciphertext, salt, serverPublicKey: serverKeyPair.publicKey };
}

function concat(...arrays: (Uint8Array | ArrayBuffer)[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + (a instanceof Uint8Array ? a.length : a.byteLength), 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    const arr = a instanceof Uint8Array ? a : new Uint8Array(a);
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ── Basitleştirilmiş push gönder (Web Push Encryption olmadan, sadece VAPID JWT) ─
// NOT: Tam RFC 8291 şifreleme yerine basit JSON payload kullanıyoruz.
// Chrome/Firefox bu formatı destekler.
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  vapidEmail: string
): Promise<Response> {
  const jwt = await createVapidJwt(subscription.endpoint, vapidPrivateKey, vapidEmail);
  const vapidHeader = `vapid t=${jwt},k=${vapidPublicKey}`;

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeader,
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body: payload,
  });

  return response;
}

// ── Ana handler ────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@kapindahub.com';

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { workspace_id, title, body: msgBody, url = '/', exclude_user_id, target_user_ids } = body;

    if (!workspace_id || !title || !msgBody) {
      return new Response(JSON.stringify({ error: 'workspace_id, title and body are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Service role ile Supabase client oluştur
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Workspace üyelerinin push aboneliklerini getir
    let devicesQuery = supabase
      .from('user_devices')
      .select(`
        id, user_id, push_token,
        workspace_members!inner(workspace_id)
      `)
      .eq('workspace_members.workspace_id', workspace_id)
      .eq('is_active', true)
      .not('push_token', 'is', null);

    if (exclude_user_id) {
      devicesQuery = devicesQuery.neq('user_id', exclude_user_id);
    }

    if (target_user_ids && target_user_ids.length > 0) {
      devicesQuery = devicesQuery.in('user_id', target_user_ids);
    }

    const { data: devices, error: devicesError } = await devicesQuery;

    if (devicesError) {
      console.error('Devices query error:', devicesError);
      return new Response(JSON.stringify({ error: devicesError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // DB'de bildirim kaydı oluştur (tüm hedef kullanıcılar için)
    if (devices && devices.length > 0) {
      const userIds = [...new Set((devices as any[]).map((d) => d.user_id))];
      const notifRecords = userIds.map((uid) => ({
        user_id: uid,
        workspace_id,
        title,
        body: msgBody,
        notification_scope: 'workspace',
        is_read: false,
      }));

      await supabase.from('notifications').insert(notifRecords);
    }

    // Push gönder
    const payload = JSON.stringify({ title, body: msgBody, url, tag: workspace_id });
    const results = await Promise.allSettled(
      (devices as any[]).map(async (device) => {
        if (!device.push_token) return;
        let subscription: any;
        try {
          subscription = JSON.parse(device.push_token);
        } catch {
          return; // Geçersiz token, atla
        }

        if (!subscription?.endpoint || !subscription?.keys) return;

        try {
          const resp = await sendWebPush(subscription, payload, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_EMAIL);
          if (!resp.ok && resp.status === 410) {
            // Abonelik geçersiz (410 Gone) — temizle
            await supabase
              .from('user_devices')
              .update({ push_token: null, is_active: false })
              .eq('id', device.id);
          }
        } catch (e) {
          console.error('Push send failed for device:', device.id, e);
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    return new Response(
      JSON.stringify({ success: true, sent, total: devices?.length ?? 0 }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    console.error('send-push error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
