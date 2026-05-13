/**
 * ============================================================
 * send-daily-reminders — Server-Side Web Push Edge Function
 * ============================================================
 *
 * HOW IT WORKS:
 * 1. A pg_cron job calls this function every 30 minutes.
 * 2. It iterates ALL rows in push_subscriptions.
 * 3. For each subscription it determines the local hour using
 *    the `timezone` column and picks the right time-of-day
 *    message variant (morning / afternoon / evening).
 * 4. It encrypts the payload per RFC 8291 (aes128gcm) and
 *    sends it via the Web Push protocol with VAPID auth (ES256).
 * 5. If the push endpoint returns 404 or 410 the subscription
 *    row is deleted (stale cleanup).
 *
 * VAPID AUTHENTICATION:
 * - ECDSA P-256 key pair stored in `app_config` table
 *   (vapid_public_key = raw base64url, vapid_private_jwk = JWK).
 * - A short-lived JWT is signed with the private key and sent
 *   in the Authorization header as `vapid t=<jwt>, k=<pub>`.
 *
 * LANGUAGE KEYS (column: `lang`):
 * - 'en' — English (default fallback)
 * - 'id' — Bahasa Indonesia
 * - 'zh' — Simplified Chinese
 *
 * TIMEZONE CONVERSION:
 * - The `timezone` column (IANA, e.g. "Asia/Jakarta") is used
 *   with Intl.DateTimeFormat to derive the subscriber's local
 *   hour so the correct time-of-day bucket is chosen.
 *
 * DEDUP:
 * - `last_morning_sent`, `last_afternoon_sent` date columns
 *   prevent sending the same slot twice on the same local day.
 *   Evening reuses `last_afternoon_sent` with tag differentiation
 *   — we add a `last_evening_sent`-style guard via a separate
 *   column check below (we store it in `last_afternoon_sent`
 *   only when the slot is afternoon; evening uses its own tag
 *   and the same date column is NOT shared — see logic below).
 *
 * NOTE: Because we only have two date columns we track evening
 * separately by checking `last_afternoon_sent` against
 * `todayStr + '-eve'` (a convention that fits the text column).
 * ============================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== Translated messages =====
interface Msg { title: string; body: string }

const morningMessages: Record<string, Msg> = {
  en: { title: "Good morning! 💪", body: "Good morning! 💪 Time to crush your workout with AI trainer. Let's go!" },
  id: { title: "Selamat pagi! 💪", body: "Selamat pagi! 💪 Waktunya workout bareng Coach Surya. Ayo mulai!" },
  zh: { title: "早上好！💪", body: "早上好！💪 是时候和AI教练一起训练了。加油！" },
};

const afternoonMessages: Record<string, Msg> = {
  en: { title: "Good afternoon! 💪", body: "Good afternoon! 💪 It's time for your workout with AI trainer 💪 Keep the momentum going!" },
  id: { title: "Selamat siang! 💪", body: "Selamat siang! 💪 Saatnya latihan hari ini. Coach Surya sudah menunggu!" },
  zh: { title: "下午好！💪", body: "下午好！💪 今天的训练时间到了。保持动力！" },
};

const eveningMessages: Record<string, Msg> = {
  en: { title: "Good evening! 🌙", body: "Good evening! 🌙 Don't skip today's workout. Your AI trainer is ready!" },
  id: { title: "Selamat malam! 🌙", body: "Selamat malam! 🌙 Jangan lewatkan workout hari ini. Coach Surya siap menemanimu!" },
  zh: { title: "晚上好！🌙", body: "晚上好！🌙 不要跳过今天的训练。你的AI教练已经准备好了！" },
};

// ===== Base64URL helpers =====
function b64UrlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
}

// ===== VAPID JWT (ES256) =====
async function createVapidToken(
  endpoint: string,
  privateJwk: JsonWebKey,
  vapidPublicKeyB64: string,
  subject: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };

  const headerB64 = b64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = b64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const input = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(input)
    )
  );

  const token = `${input}.${b64UrlEncode(sig)}`;
  return `vapid t=${token}, k=${vapidPublicKeyB64}`;
}

// ===== Web Push Payload Encryption (RFC 8291, aes128gcm) =====
async function encryptPayload(
  payloadStr: string,
  p256dhB64: string,
  authB64: string
): Promise<Uint8Array> {
  const subscriberPubBytes = b64UrlDecode(p256dhB64);
  const authSecret = b64UrlDecode(authB64);
  const plaintext = new TextEncoder().encode(payloadStr);

  const senderKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const subscriberPub = await crypto.subtle.importKey(
    "raw",
    subscriberPubBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecretBuf = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPub },
    senderKeys.privateKey,
    256
  );

  const senderPubBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderKeys.publicKey)
  );

  const infoPrefix = new TextEncoder().encode("WebPush: info\0");
  const ikmInfo = new Uint8Array(infoPrefix.length + subscriberPubBytes.length + senderPubBytes.length);
  ikmInfo.set(infoPrefix, 0);
  ikmInfo.set(subscriberPubBytes, infoPrefix.length);
  ikmInfo.set(senderPubBytes, infoPrefix.length + subscriberPubBytes.length);

  const hkdfKey1 = await crypto.subtle.importKey("raw", sharedSecretBuf, { name: "HKDF" }, false, ["deriveBits"]);
  const ikmBuf = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: ikmInfo },
    hkdfKey1,
    32 * 8
  );
  const ikm = new Uint8Array(ikmBuf);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const hkdfKey2 = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const cekBuf = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    hkdfKey2,
    16 * 8
  );

  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const hkdfKey3 = await crypto.subtle.importKey("raw", new Uint8Array(ikm), { name: "HKDF" }, false, ["deriveBits"]);
  const nonceBuf = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    hkdfKey3,
    12 * 8
  );

  const paddedPayload = new Uint8Array(plaintext.length + 1);
  paddedPayload.set(plaintext);
  paddedPayload[plaintext.length] = 0x02;

  const aesKey = await crypto.subtle.importKey("raw", cekBuf, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(nonceBuf) },
      aesKey,
      paddedPayload
    )
  );

  const rs = 4096;
  const body = new Uint8Array(16 + 4 + 1 + 65 + encrypted.length);
  body.set(salt, 0);
  body[16] = (rs >> 24) & 0xff;
  body[17] = (rs >> 16) & 0xff;
  body[18] = (rs >> 8) & 0xff;
  body[19] = rs & 0xff;
  body[20] = 65;
  body.set(senderPubBytes, 21);
  body.set(encrypted, 21 + 65);

  return body;
}

// ===== Send a single Web Push notification =====
async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateJwk: JsonWebKey
): Promise<{ success: boolean; status: number }> {
  try {
    const payloadStr = JSON.stringify(payload);
    const encryptedBody = await encryptPayload(payloadStr, p256dh, auth);
    const authorization = await createVapidToken(
      endpoint,
      vapidPrivateJwk,
      vapidPublicKey,
      "https://surya-fitai.lovable.app"
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "normal",
      },
      body: encryptedBody,
    });

    return { success: response.ok, status: response.status };
  } catch (e) {
    console.error("Web Push send error:", e);
    return { success: false, status: 0 };
  }
}

// ===== Main handler =====
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Get VAPID keys
  const { data: pubKeyRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "vapid_public_key")
    .single();

  const { data: privJwkRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "vapid_private_jwk")
    .single();

  if (!pubKeyRow || !privJwkRow) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const vapidPublicKey = pubKeyRow.value;
  const vapidPrivateJwk = JSON.parse(privJwkRow.value) as JsonWebKey;

  // 2. Get all subscriptions
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (error || !subscriptions) {
    return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  let sent = 0;
  let deleted = 0;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    try {
      const tz = sub.timezone || "Asia/Jakarta";

      // Get current hour in subscription's timezone
      const hourStr = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).format(now);
      const hour = parseInt(hourStr, 10);

      // Get today's date string in subscription's timezone
      const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
      }).format(now);

      const lang = sub.lang || "en";
      let payload: { title: string; body: string; tag: string } | null = null;
      let updateField: string | null = null;
      let updateValue: string = todayStr;

      // Morning (7 AM) and Afternoon (3 PM) reminders removed per product decision.
      // Only the evening reminder remains active.

      // Evening: 18:00–22:59
      if (!payload && hour >= 18 && hour < 23 && sub.last_evening_sent !== todayStr) {
        const msg = eveningMessages[lang] || eveningMessages.en;
        payload = { ...msg, tag: "evening-reminder" };
        updateField = "last_evening_sent";
      }

      if (payload && updateField) {
        const result = await sendWebPush(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          payload,
          vapidPublicKey,
          vapidPrivateJwk
        );

        if (result.success) {
          sent++;
          await supabase
            .from("push_subscriptions")
            .update({ [updateField]: updateValue })
            .eq("id", sub.id);
        } else if (result.status === 404 || result.status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          deleted++;
        } else {
          errors.push(`${sub.id}: status ${result.status}`);
        }
      }
    } catch (e) {
      errors.push(`${sub.id}: ${e.message}`);
    }
  }

  console.log(`send-daily-reminders: total=${subscriptions.length} sent=${sent} deleted=${deleted} errors=${errors.length}`);

  return new Response(
    JSON.stringify({
      total: subscriptions.length,
      sent,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
