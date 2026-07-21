import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../cors.ts";
import { errorResponse } from "../errors.ts";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function generateToken(): string {
  // const bytes = new Uint8Array(32);
  // crypto.getRandomValues(bytes);
  // return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return crypto.randomUUID();
}

export async function addSigner(req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("status")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");
  if (doc.status !== "draft") return errorResponse(400, "invalid_status", "Can only add signers to draft documents");

  const body = await req.json().catch(() => ({}));
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const signingOrder = typeof body.order === "number" ? body.order : (body.signing_order || 0);
  const fields = Array.isArray(body.fields) ? body.fields : [];

  if (!name) return errorResponse(400, "validation_error", "name is required");
  if (!email) return errorResponse(400, "validation_error", "email is required");

  const colors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];
  const colorIndex = Math.floor(Math.random() * colors.length);

  const accessToken = generateToken();

  const { data: signer, error } = await supabase
    .from("document_signers")
    .insert({
      document_id: params.id,
      name,
      email,
      access_token: accessToken,
      signing_order: signingOrder,
      status: "pending",
      color: colors[colorIndex],
    })
    .select("*")
    .single();

  if (error) return errorResponse(500, "create_failed", error.message);

  if (fields.length > 0) {
    const fieldInserts = fields.map((f: Record<string, unknown>) => ({
      document_id: params.id,
      signer_id: signer.id,
      field_type: f.type || "signature",
      page_number: f.page || 1,
      x: f.x || 0,
      y: f.y || 0,
      width: f.w || 200,
      height: f.h || 50,
      label: f.label || null,
    }));

    const { error: fieldErr } = await supabase.from("document_fields").insert(fieldInserts);
    if (fieldErr) {
      // rollback signer
      await supabase.from("document_signers").delete().eq("id", signer.id);
      return errorResponse(500, "field_error", fieldErr.message);
    }
  }

  const { data: createdFields } = await supabase
    .from("document_fields")
    .select("*")
    .eq("document_id", params.id)
    .eq("signer_id", signer.id);

  return new Response(JSON.stringify({
    data: { ...signer, fields: createdFields || [] },
  }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function listSigners(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");

  const { data: signers, error } = await supabase
    .from("document_signers")
    .select("*")
    .eq("document_id", params.id)
    .order("signing_order", { ascending: true });

  if (error) return errorResponse(500, "db_error", error.message);

  for (const signer of signers || []) {
    const { data: fields } = await supabase
      .from("document_fields")
      .select("*")
      .eq("document_id", params.id)
      .eq("signer_id", signer.id);
    (signer as Record<string, unknown>).fields = fields || [];
  }

  return new Response(JSON.stringify({ data: signers || [] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function updateSigner(req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("status")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");
  if (doc.status !== "draft") return errorResponse(400, "invalid_status", "Can only update signers on draft documents");

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (body.name) updates.name = body.name;
  if (body.email) updates.email = body.email;
  if (body.order !== undefined || body.signing_order !== undefined) {
    updates.signing_order = body.order ?? body.signing_order;
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "validation_error", "No fields to update");
  }

  const { data, error } = await supabase
    .from("document_signers")
    .update(updates)
    .eq("id", params.signerId)
    .eq("document_id", params.id)
    .select("*")
    .single();

  if (error) return errorResponse(500, "update_failed", error.message);
  if (!data) return errorResponse(404, "not_found", "Signer not found");

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function removeSigner(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("status")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");
  if (doc.status !== "draft") return errorResponse(400, "invalid_status", "Can only remove signers from draft documents");

  await supabase.from("document_fields").delete().eq("signer_id", params.signerId);

  const { error } = await supabase
    .from("document_signers")
    .delete()
    .eq("id", params.signerId)
    .eq("document_id", params.id);

  if (error) return errorResponse(500, "delete_failed", error.message);

  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function addField(req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("status")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");
  if (doc.status !== "draft") return errorResponse(400, "invalid_status", "Can only add fields to draft documents");

  const body = await req.json().catch(() => ({}));

  const { data: field, error } = await supabase
    .from("document_fields")
    .insert({
      document_id: params.id,
      signer_id: params.signerId,
      field_type: body.type || "signature",
      page_number: body.page || 1,
      x: body.x || 0,
      y: body.y || 0,
      width: body.w || 200,
      height: body.h || 50,
      label: body.label || null,
    })
    .select("*")
    .single();

  if (error) return errorResponse(500, "create_failed", error.message);

  return new Response(JSON.stringify({ data: field }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function updateField(req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (body.type) updates.field_type = body.type;
  if (body.page !== undefined) updates.page_number = body.page;
  if (body.x !== undefined) updates.x = body.x;
  if (body.y !== undefined) updates.y = body.y;
  if (body.w !== undefined) updates.width = body.w;
  if (body.h !== undefined) updates.height = body.h;
  if (body.label !== undefined) updates.label = body.label;

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "validation_error", "No fields to update");
  }

  const { data, error } = await supabase
    .from("document_fields")
    .update(updates)
    .eq("id", params.fieldId)
    .eq("document_id", params.id)
    .select("*")
    .single();

  if (error) return errorResponse(500, "update_failed", error.message);
  if (!data) return errorResponse(404, "not_found", "Field not found");

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function removeField(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("document_fields")
    .delete()
    .eq("id", params.fieldId)
    .eq("document_id", params.id);

  if (error) return errorResponse(500, "delete_failed", error.message);

  return new Response(null, { status: 204, headers: corsHeaders });
}
