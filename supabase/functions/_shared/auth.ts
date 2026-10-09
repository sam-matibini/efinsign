import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  organization_id: string;
  mode: string;
  scopes: string[];
  key_id: string;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateApiKey(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const key = authHeader.slice(7).trim();

  if (!key.startsWith("efsk_")) {
    throw new Error("Invalid API key format");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const keyHash = await sha256Hex(key);

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, organization_id, mode, scopes, usage_count, usage_limit, revoked_at")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (error || !data) {
    throw new Error("Invalid or revoked API key");
  }

  if (data.usage_count >= data.usage_limit) {
    throw new Error("API key usage limit exceeded");
  }

  await supabase
    .from("api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: data.usage_count + 1,
    })
    .eq("id", data.id);

  return {
    organization_id: data.organization_id,
    mode: data.mode,
    scopes: data.scopes || [],
    key_id: data.id,
  };
}

export async function validateSupabaseJwt(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.slice(7).trim();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Error("Invalid token");
  }

  return data.claims.sub;
}

export function requireScope(auth: AuthResult, requiredScope: string): void {
  if (!auth.scopes.includes(requiredScope)) {
    throw new Error(`Missing required scope: ${requiredScope}`);
  }
}

export function generateApiKey(): string {
  const prefix = "efsk_live_";
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const randomPart = Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
  return prefix + randomPart;
}

export async function hashKey(key: string): Promise<string> {
  return await sha256Hex(key);
}

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  const parts = signature.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, val] = part.split("=");
    acc[key] = val;
    return acc;
  }, {});

  const t = parseInt(parts.t || "0");
  if (!t) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > toleranceSeconds) return false;

  const signedPayload = `${t}.${payload}`;
  const expected = parts.v1;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signedPayload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === expected;
}
