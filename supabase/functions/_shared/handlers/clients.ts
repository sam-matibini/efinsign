import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../cors.ts";
import { errorResponse } from "../errors.ts";
import { getPagination, paginatedResponse } from "../pagination.ts";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function createClient_(req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();

  if (!name) return errorResponse(400, "validation_error", "name is required");

  const { data, error } = await supabase
    .from("clients")
    .insert({
      organization_id: ctx.organization_id,
      name,
      email: email || null,
      company: body.company || null,
      address: body.address || null,
      city: body.city || null,
      country: body.country || null,
      postal_code: body.postal_code || null,
    })
    .select("*")
    .single();

  if (error) return errorResponse(500, "create_failed", error.message);

  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function listClients(req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();
  const url = new URL(req.url);
  const { page, perPage, offset } = getPagination(url);
  const search = url.searchParams.get("search") || undefined;

  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.organization_id)
    .order("name", { ascending: true })
    .range(offset, offset + perPage - 1);

  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);

  const { data, error, count } = await query;

  if (error) return errorResponse(500, "db_error", error.message);

  return new Response(
    JSON.stringify(paginatedResponse(data || [], count || 0, { page, perPage, offset })),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export async function getClient(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (error || !data) return errorResponse(404, "not_found", "Client not found");

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function updateClient(req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.company !== undefined) updates.company = body.company;
  if (body.address !== undefined) updates.address = body.address;
  if (body.city !== undefined) updates.city = body.city;
  if (body.country !== undefined) updates.country = body.country;
  if (body.postal_code !== undefined) updates.postal_code = body.postal_code;

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "validation_error", "No fields to update");
  }

  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .select("*")
    .single();

  if (error) return errorResponse(500, "update_failed", error.message);
  if (!data) return errorResponse(404, "not_found", "Client not found");

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function deleteClient(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id);

  if (error) return errorResponse(500, "delete_failed", error.message);

  return new Response(null, { status: 204, headers: corsHeaders });
}
