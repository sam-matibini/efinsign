import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, corsPreflight } from "../_shared/cors.ts";

async function sha256(message: string): Promise<ArrayBuffer> {
  return await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Process pending deliveries (up to 50 per run to stay within timeout)
    const { data: deliveries } = await supabase
      .from("webhook_deliveries")
      .select("id, webhook_id, event_type, payload")
      .is("response_status", null)
      .order("attempted_at", { ascending: true })
      .limit(50);

    if (!deliveries || deliveries.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const delivery of deliveries) {
      const { data: webhook } = await supabase
        .from("webhooks")
        .select("id, url, secret, failure_count, is_active")
        .eq("id", delivery.webhook_id)
        .single();

      if (!webhook || !webhook.is_active) {
        await supabase.from("webhook_deliveries").update({ response_status: 410, response_body: "webhook disabled" }).eq("id", delivery.id);
        continue;
      }

      if (webhook.failure_count >= 5) {
        await supabase.from("webhook_deliveries").update({ response_status: 429, response_body: "max failures reached" }).eq("id", delivery.id);
        continue;
      }

      try {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const payloadStr = JSON.stringify(delivery.payload);
        const signedPayload = `${timestamp}.${payloadStr}`;
        const signature = await hmacSha256(webhook.secret, signedPayload);

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Efinsign-Signature": `t=${timestamp},v1=${signature}`,
            "X-Efinsign-Event": delivery.event_type,
            "X-Efinsign-Delivery-Id": delivery.id,
            "User-Agent": "eFinSign-Webhook/1.0",
          },
          body: payloadStr,
          signal: AbortSignal.timeout(10000),
        });

        const responseBody = await response.text().catch(() => "");

        await supabase
          .from("webhook_deliveries")
          .update({
            response_status: response.status,
            response_body: responseBody.slice(0, 1000),
          })
          .eq("id", delivery.id);

        if (response.ok) {
          await supabase
            .from("webhooks")
            .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
            .eq("id", webhook.id);
        } else {
          await supabase
            .from("webhooks")
            .update({
              last_attempt_at: new Date().toISOString(),
              failure_count: webhook.failure_count + 1,
            })
            .eq("id", webhook.id);
        }

        processed++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        await supabase
          .from("webhook_deliveries")
          .update({ response_status: 0, response_body: errorMsg })
          .eq("id", delivery.id);

        await supabase
          .from("webhooks")
          .update({
            last_attempt_at: new Date().toISOString(),
            failure_count: webhook.failure_count + 1,
          })
          .eq("id", webhook.id);
      }
    }

    return new Response(JSON.stringify({ processed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
