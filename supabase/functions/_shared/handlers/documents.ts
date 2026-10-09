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

async function findOrgAdmin(orgId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "admin")
    .limit(1)
    .single();
  return data?.user_id || null;
}

export async function createDocument(req: Request, _params: Record<string, string>, ctx: { organization_id: string; mode: string }) {
  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return errorResponse(400, "bad_request", "Content-Type must be multipart/form-data");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return errorResponse(400, "bad_request", "Invalid form data");
  }

  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string || "").trim();

  if (!file) return errorResponse(400, "validation_error", "file is required");
  if (!title) return errorResponse(400, "validation_error", "title is required");

  const supabase = getSupabase();

  const safeDocName = (file.name || "document.pdf")
    .replace(/[^\w\s.()\[\]-]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/-{2,}/g, "-");
  const filePath = `${ctx.organization_id}/${Date.now()}_${safeDocName}`;
  const fileBuffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from("documents")
    .upload(filePath, fileBuffer, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (uploadErr) return errorResponse(500, "upload_failed", uploadErr.message);

  const ownerId = await findOrgAdmin(ctx.organization_id);

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      title,
      organization_id: ctx.organization_id,
      owner_id: ownerId,
      file_path: filePath,
      status: "draft",
    })
    .select("*")
    .single();

  if (docErr) return errorResponse(500, "create_failed", docErr.message);

  return new Response(JSON.stringify({ data: doc }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function listDocuments(req: Request, _params: Record<string, string>, ctx: { organization_id: string }) {
  const url = new URL(req.url);
  const { page, perPage, offset } = getPagination(url);
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const supabase = getSupabase();

  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status) query = query.eq("status", status);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error, count } = await query;

  if (error) return errorResponse(500, "db_error", error.message);

  return new Response(
    JSON.stringify(paginatedResponse(data || [], count || 0, { page, perPage, offset })),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export async function getDocument(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (error || !doc) return errorResponse(404, "not_found", "Document not found");

  const { data: signers } = await supabase
    .from("document_signers")
    .select("*")
    .eq("document_id", params.id)
    .order("signing_order", { ascending: true });

  const { data: fields } = await supabase
    .from("document_fields")
    .select("*")
    .eq("document_id", params.id);

  return new Response(JSON.stringify({
    data: { ...doc, signers: signers || [], fields: fields || [] },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function updateDocument(req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (body.title) updates.title = body.title;

  if (Object.keys(updates).length === 0) {
    return errorResponse(400, "validation_error", "No fields to update");
  }

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .select("*")
    .single();

  if (error) return errorResponse(500, "update_failed", error.message);
  if (!data) return errorResponse(404, "not_found", "Document not found");

  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function deleteDocument(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("status, file_path")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");
  if (doc.status !== "draft") return errorResponse(400, "invalid_status", "Only draft documents can be deleted");

  if (doc.file_path) {
    await supabase.storage.from("documents").remove([doc.file_path]);
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", params.id);

  if (error) return errorResponse(500, "delete_failed", error.message);

  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function downloadDocument(req: Request, params: Record<string, string>, ctx: { organization_id: string; mode: string }) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "original";

  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("file_path, signed_file_path, status")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");

  const filePath = type === "signed" ? doc.signed_file_path : doc.file_path;
  if (!filePath) {
    return errorResponse(404, "not_found", type === "signed" ? "No signed file available" : "No file available");
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .download(filePath);

  if (error || !data) return errorResponse(500, "download_failed", error?.message || "Download failed");

  return new Response(data, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${doc.title || "document"}.pdf"`,
    },
  });
}

export async function getAuditLog(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: log, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("document_id", params.id)
    .eq("organization_id", ctx.organization_id)
    .order("created_at", { ascending: false });

  if (error) return errorResponse(500, "db_error", error.message);

  return new Response(JSON.stringify({ data: log || [] }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function sendDocument(_req: Request, params: Record<string, string>, ctx: { organization_id: string; mode: string }) {
  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("status, owner_id")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");
  if (doc.status !== "draft") return errorResponse(400, "invalid_status", "Document must be in draft status");

  const { count } = await supabase
    .from("document_signers")
    .select("*", { count: "exact", head: true })
    .eq("document_id", params.id);

  if (!count || count === 0) {
    return errorResponse(400, "no_signers", "Document must have at least one signer");
  }

  const { error: updateErr } = await supabase
    .from("documents")
    .update({ status: "pending" })
    .eq("id", params.id);

  if (updateErr) return errorResponse(500, "send_failed", updateErr.message);

  // Send signer invitation emails. This must not silently swallow failures —
  // a broken email path should be visible in the API response, not hidden
  // behind a 200 with an empty catch.
  const notifications = await invokeNotifications(supabase, { document_id: params.id });

  try {
    await supabase.functions.invoke("dispatch-webhooks", { body: {} });
  } catch {
    // dispatch failure shouldn't block the response
  }

  const { data: refreshed } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .single();

  return new Response(JSON.stringify({
    data: { ...refreshed, notifications },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface NotificationSummary {
  sent: number;
  failed: number;
  status: "sent" | "partial" | "failed";
  error?: string;
}

// Invokes send-signing-notifications and normalizes the outcome into a summary
// that can be surfaced to the API caller. Never throws.
async function invokeNotifications(
  supabase: ReturnType<typeof getSupabase>,
  body: Record<string, unknown>,
): Promise<NotificationSummary> {
  try {
    const { data, error } = await supabase.functions.invoke("send-signing-notifications", {
      body,
      // Prove this is a trusted internal call. send-signing-notifications is JWT-gated
      // for web-app users; the service-role key here lets it skip that per-user check.
      headers: { "x-internal-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! },
    });

    if (error) {
      // Try to surface the underlying function error body (Resend error, 403, etc.)
      let detail = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          const text = await ctx.text();
          if (text) detail = text;
        }
      } catch {
        // fall back to error.message
      }
      return { sent: 0, failed: 0, status: "failed", error: detail };
    }

    const results = Array.isArray(data?.results) ? data.results : [];
    const sent = results.filter((r: { success: boolean }) => r.success).length;
    const failed = results.filter((r: { success: boolean }) => !r.success).length;
    const firstError = results.find((r: { success: boolean; error?: string }) => !r.success)?.error;

    const status: NotificationSummary["status"] =
      failed === 0 && sent > 0 ? "sent" : sent > 0 ? "partial" : "failed";

    return { sent, failed, status, ...(firstError ? { error: firstError } : {}) };
  } catch (err) {
    return {
      sent: 0,
      failed: 0,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function voidDocument(_req: Request, params: Record<string, string>, ctx: { organization_id: string }) {
  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("status")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");
  if (doc.status !== "pending") return errorResponse(400, "invalid_status", "Only pending documents can be voided");

  const { error } = await supabase
    .from("documents")
    .update({ status: "expired" })
    .eq("id", params.id);

  if (error) return errorResponse(500, "void_failed", error.message);

  try {
    await supabase.functions.invoke("dispatch-webhooks", { body: {} });
  } catch {
    // non-blocking
  }

  return new Response(JSON.stringify({ data: { success: true, status: "expired" } }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function remindDocument(_req: Request, params: Record<string, string>, ctx: { organization_id: string; mode: string }) {
  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from("documents")
    .select("status")
    .eq("id", params.id)
    .eq("organization_id", ctx.organization_id)
    .single();

  if (!doc) return errorResponse(404, "not_found", "Document not found");
  if (doc.status !== "pending") return errorResponse(400, "invalid_status", "Only pending documents can receive reminders");

  const notifications = await invokeNotifications(supabase, {
    document_id: params.id,
    reminder: true,
  });

  if (notifications.status === "failed") {
    return errorResponse(502, "reminder_failed", notifications.error || "Failed to send reminder emails");
  }

  return new Response(JSON.stringify({
    data: { success: true, message: "Reminder sent", notifications },
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
