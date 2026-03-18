import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64UrlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey)
  );
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const publicKey = b64UrlEncode(publicRaw);

  return { publicKey, privateJwk: JSON.stringify(privateJwk) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check if keys already exist
  const { data: existing } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "vapid_public_key")
    .single();

  if (existing) {
    return new Response(JSON.stringify({ publicKey: existing.value }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate new VAPID keys
  const { publicKey, privateJwk } = await generateVapidKeys();

  // Store both keys
  await supabase.from("app_config").upsert([
    { key: "vapid_public_key", value: publicKey },
    { key: "vapid_private_jwk", value: privateJwk },
  ]);

  return new Response(JSON.stringify({ publicKey }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
