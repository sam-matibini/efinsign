import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../cors.ts";
import { errorResponse } from "../errors.ts";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function getOrganization(_req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", ctx.organization_id)
    .single();

  if (error || !data) return errorResponse(404, "not_found", "Organization not found");

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function updateOrganization(req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.address !== undefined) updates.address = body.address;
  if (body.city !== undefined) updates.city = body.city;
  if (body.postal_code !== undefined) updates.postal_code = body.postal_code;
  if (body.country !== undefined) updates.country = body.country;
  if (body.email !== undefined) updates.email = body.email;
  if (body.telephone !== undefined) updates.telephone = body.telephone;

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "validation_error", "No fields to update");
  }

  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", ctx.organization_id)
    .select("*")
    .single();

  if (error) return errorResponse(500, "update_failed", error.message);

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function getUsage(_req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { count: docCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", ctx.organization_id);

  const { count: pendingCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", ctx.organization_id)
    .eq("status", "pending");

  const { data: keyUsage } = await supabase
    .from("api_keys")
    .select("usage_count, usage_limit")
    .eq("organization_id", ctx.organization_id)
    .is("revoked_at", null);

  const totalApiCalls = (keyUsage || []).reduce((sum, k) => sum + (k.usage_count || 0), 0);
  const totalApiLimit = (keyUsage || []).reduce((sum, k) => sum + (k.usage_limit || 0), 0);

  return new Response(JSON.stringify({
    data: {
      total_documents: docCount || 0,
      pending_documents: pendingCount || 0,
      api_calls: totalApiCalls,
      api_call_limit: totalApiLimit,
    },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
