import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../cors.ts";
import { errorResponse } from "../errors.ts";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const VALID_EVENTS = [
  "document.sent",
  "document.completed",
  "document.declined",
  "document.signer_signed",
  "document.reminded",
  "document.voided",
  "document.signer_declined",
];

export async function createWebhook(req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));
  const url = (body.url || "").trim();
  const events: string[] = (Array.isArray(body.events) ? body.events : []).filter((e: string) => VALID_EVENTS.includes(e));
  const secret = generateSecret();

  if (!url) return errorResponse(400, "validation_error", "url is required");
  if (events.length === 0) return errorResponse(400, "validation_error", "at least one valid event is required");

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      organization_id: ctx.organization_id,
      url,
      secret,
      events,
    })
    .select("*")
    .single();

  if (error) return errorResponse(500, "create_failed", error.message);

  return new Response(JSON.stringify({
    data: { ...data, secret, message: "Store this secret. It will not be shown again." },
  }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function listWebhooks(_req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("webhooks")
    .select("id, url, events, is_active, last_attempt_at, last_success_at, failure_count, created_at")
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false });

  if (error) return errorResponse(500, "db_error", error.message);

  return new Response(JSON.stringify({ data: data || [] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function deleteWebhook(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id);

  if (error) return errorResponse(500, "delete_failed", error.message);

  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function testWebhook(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: webhook } = await supabase
    .from("webhooks")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!webhook) return errorResponse(404, "not_found", "Webhook not found");

  const payload = {
    event: "test",
    webhook_id: webhook.id,
    message: "This is a test event from eFinSign",
    timestamp: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("webhook_deliveries")
    .insert({
      webhook_id: webhook.id,
      event_type: "test",
      payload,
    });

  if (error) return errorResponse(500, "queue_failed", error.message);

  return new Response(JSON.stringify({
    data: { success: true, message: "Test event queued for delivery" },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
