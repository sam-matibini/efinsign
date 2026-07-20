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

export async function createTemplate(req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const contentType = req.headers.get("content-type") || "";

  let filePath: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (file) {
      filePath = `${ctx.organization_id}/templates/${Date.now()}_${file.name || "template.pdf"}`;
      const fileBuffer = new Uint8Array(await file.arrayBuffer());
      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(filePath, fileBuffer, {
          contentType: file.type || "application/pdf",
          upsert: false,
        });
      if (uploadErr) return errorResponse(500, "upload_failed", uploadErr.message);
    }

    const title = (formData.get("title") as string || "").trim();
    const description = (formData.get("description") as string || "").trim();
    const signersRaw = formData.get("signers") as string;
    const fieldsRaw = formData.get("fields") as string;
    const tagsRaw = formData.get("tags") as string;

    const insert: Record<string, unknown> = {
      organization_id: ctx.organization_id,
      title,
      description: description || null,
      file_path: filePath,
    };

    if (signersRaw) {
      try { insert.signers = JSON.parse(signersRaw); } catch { /* ignore */ }
    }
    if (fieldsRaw) {
      try { insert.fields = JSON.parse(fieldsRaw); } catch { /* ignore */ }
    }
    if (tagsRaw) {
      try { insert.tags = JSON.parse(tagsRaw); } catch { /* ignore */ }
    }

    const { data, error } = await supabase
      .from("templates")
      .insert(insert)
      .select("*")
      .single();

    if (error) return errorResponse(500, "create_failed", error.message);

    return new Response(JSON.stringify({ data }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title || "").trim();

  if (!title) return errorResponse(400, "validation_error", "title is required");

  const insert: Record<string, unknown> = {
    organization_id: ctx.organization_id,
    title,
    description: body.description || null,
    signers: body.signers || null,
    fields: body.fields || null,
    tags: body.tags || null,
  };

  const { data, error } = await supabase
    .from("templates")
    .insert(insert)
    .select("*")
    .single();

  if (error) return errorResponse(500, "create_failed", error.message);

  return new Response(JSON.stringify({ data }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function listTemplates(req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();
  const url = new URL(req.url);
  const { page, perPage, offset } = getPagination(url);
  const search = url.searchParams.get("search") || undefined;

  let query = supabase
    .from("templates")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error, count } = await query;

  if (error) return errorResponse(500, "db_error", error.message);

  return new Response(
    JSON.stringify(paginatedResponse(data || [], count || 0, { page, perPage, offset })),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export async function getTemplate(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (error || !data) return errorResponse(404, "not_found", "Template not found");

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function deleteTemplate(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id);

  if (error) return errorResponse(500, "delete_failed", error.message);

  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function createDocumentFromTemplate(req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!template) return errorResponse(404, "not_found", "Template not found");

  const body = await req.json().catch(() => ({}));
  const title = (body.title || template.title || "Untitled").trim();

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      title,
      organization_id: ctx.organization_id,
      file_path: template.file_path,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) return errorResponse(500, "create_failed", error.message);

  if (template.signers && Array.isArray(template.signers)) {
    for (const s of template.signers as Array<Record<string, unknown>>) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data: signer } = await supabase
        .from("document_signers")
        .insert({
          document_id: doc.id,
          name: s.name || "",
          email: s.email || "",
          access_token: token,
          signing_order: s.order ?? s.signing_order ?? 0,
          status: "pending",
          color: "#3B82F6",
        })
        .select("*")
        .single();

      if (signer && template.fields && Array.isArray(template.fields)) {
        const signerFields = (template.fields as Array<Record<string, unknown>>)
          .filter((f) => f.signer_index === template.signers.indexOf(s));
        if (signerFields.length > 0) {
          await supabase.from("document_fields").insert(
            signerFields.map((f) => ({
              document_id: doc.id,
              signer_id: signer.id,
              field_type: f.type || "signature",
              page_number: f.page || 1,
              x: f.x || 0,
              y: f.y || 0,
              width: f.w || 200,
              height: f.h || 50,
              label: f.label || null,
            })),
          );
        }
      }
    }
  }

  const { data: result } = await supabase
    .from("documents")
    .select("*")
    .eq("id", doc.id)
    .single();

  return new Response(JSON.stringify({ data: result }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
