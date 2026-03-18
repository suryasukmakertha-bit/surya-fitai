import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== Translated messages =====
const morningMessages: Record<string, { title: string; body: string }> = {
  en: { title: "Hey champion! 💪", body: "It's 7 AM — time to train with your AI trainer 💪 Let's make today strong!" },
  id: { title: "Hei juara! 💪", body: "Jam 7 pagi — waktunya latihan dengan AI trainer kamu 💪 Ayo buat hari ini kuat!" },
  zh: { title: "嘿，冠军！💪", body: "现在是早上7点 — 该和你的AI教练一起训练了 💪 让我们让今天更强大！" },
};

const afternoonMessages: Record<string, { title: string; body: string }> = {
  en: { title: "Good afternoon! 💪", body: "It's 3 PM — perfect time for your workout with AI trainer 💪 Keep the momentum going!" },
  id: { title: "Selamat sore! 💪", body: "Jam 3 siang — waktu yang tepat untuk latihan dengan AI trainer kamu 💪 Jaga semangatnya!" },
  zh: { title: "下午好！💪", body: "现在是下午3点 — 完美的时间和AI教练一起训练 💪 保持动力！" },
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

  // 1. Generate ephemeral ECDH key pair
  const senderKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // 2. Import subscriber public key
  const subscriberPub = await crypto.subtle.importKey(
    "raw",
    subscriberPubBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // 3. ECDH shared secret
  const sharedSecretBuf = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPub },
    senderKeys.privateKey,
    256
  );

  // 4. Export sender public key (raw, 65 bytes uncompressed)
  const senderPubBytes = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderKeys.publicKey)
  );

  // 5. Build key_info for IKM derivation
  // key_info = "WebPush: info\0" || ua_public || as_public
  const infoPrefix = new TextEncoder().encode("WebPush: info\0");
  const ikmInfo = new Uint8Array(infoPrefix.length + subscriberPubBytes.length + senderPubBytes.length);
  ikmInfo.set(infoPrefix, 0);
  ikmInfo.set(subscriberPubBytes, infoPrefix.length);
  ikmInfo.set(senderPubBytes, infoPrefix.length + subscriberPubBytes.length);

  // 6. Derive IKM: HKDF(salt=auth_secret, ikm=ecdh_secret, info=key_info, 32)
  const hkdfKey1 = await crypto.subtle.importKey(
    "raw",
    sharedSecretBuf,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );
  const ikmBuf = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: ikmInfo },
    hkdfKey1,
    32 * 8
  );
  const ikm = new Uint8Array(ikmBuf);

  // 7. Random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 8. Derive CEK: HKDF(salt=salt, ikm=IKM, info="Content-Encoding: aes128gcm\0", 16)
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const hkdfKey2 = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const cekBuf = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    hkdfKey2,
    16 * 8
  );

  // 9. Derive Nonce: HKDF(salt=salt, ikm=IKM, info="Content-Encoding: nonce\0", 12)
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const hkdfKey3 = await crypto.subtle.importKey("raw", new Uint8Array(ikm), { name: "HKDF" }, false, ["deriveBits"]);
  const nonceBuf = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    hkdfKey3,
    12 * 8
  );

  // 10. Pad payload: plaintext || 0x02 (delimiter, last record)
  const paddedPayload = new Uint8Array(plaintext.length + 1);
  paddedPayload.set(plaintext);
  paddedPayload[plaintext.length] = 0x02;

  // 11. Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cekBuf, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(nonceBuf) },
      aesKey,
      paddedPayload
    )
  );

  // 12. Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
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
    return new Response(JSON.stringify({ error: "VAPID keys not configured. Call get-vapid-key first." }), {
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
      // Get current hour in subscription's timezone
      const hourStr = new Intl.DateTimeFormat("en-US", {
        timeZone: sub.timezone || "Asia/Jakarta",
        hour: "numeric",
        hour12: false,
      }).format(now);
      const hour = parseInt(hourStr, 10);

      // Get today's date in subscription's timezone
      const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: sub.timezone || "Asia/Jakarta",
      }).format(now);

      const lang = sub.lang || "en";
      let payload: { title: string; body: string; tag: string } | null = null;
      let updateField: string | null = null;

      // Morning: 7:00–8:00
      if (hour >= 7 && hour < 8 && sub.last_morning_sent !== todayStr) {
        const msg = morningMessages[lang] || morningMessages.en;
        payload = { ...msg, tag: "morning-reminder" };
        updateField = "last_morning_sent";
      }

      // Afternoon: 15:00–16:00
      if (hour >= 15 && hour < 16 && sub.last_afternoon_sent !== todayStr) {
        const msg = afternoonMessages[lang] || afternoonMessages.en;
        payload = { ...msg, tag: "afternoon-reminder" };
        updateField = "last_afternoon_sent";
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
          // Update last sent date
          await supabase
            .from("push_subscriptions")
            .update({ [updateField]: todayStr })
            .eq("id", sub.id);
        } else if (result.status === 404 || result.status === 410) {
          // Subscription expired — remove it
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
