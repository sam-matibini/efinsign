import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { wrapTextToWidth } from "@/lib/textWrap";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SCALE = 1.5;

export interface SignedPdfOptions {
  includeTimestamp?: boolean;
  /**
   * Optional signer client and access token. When provided, the renderer
   * loads document data through the token-gated RPC instead of direct
   * table reads, so anonymous signers can finalize the PDF without
   * needing broad RLS access.
   */
  client?: SupabaseClient<Database>;
  accessToken?: string;
}

type FieldRow = Database["public"]["Tables"]["document_fields"]["Row"];
type SigRow = { signer_id: string; image_data: string };
type SignerRow = { id: string; signed_at: string | null; name: string };

async function loadRenderData(
  documentId: string,
  options: SignedPdfOptions
): Promise<{ fields: FieldRow[]; signatures: SigRow[]; signers: SignerRow[] }> {
  if (options.accessToken && options.client) {
    const { data, error } = await options.client.rpc("get_signing_render_data", {
      p_token: options.accessToken,
    });
    if (error) throw new Error(`Failed to load signing data: ${error.message}`);
    const payload = data as {
      fields: FieldRow[];
      signatures: SigRow[];
      signers: SignerRow[];
    };
    return {
      fields: payload?.fields ?? [],
      signatures: payload?.signatures ?? [],
      signers: payload?.signers ?? [],
    };
  }

  const [fieldsRes, signaturesRes, signersRes] = await Promise.all([
    supabase.from("document_fields").select("*").eq("document_id", documentId),
    supabase
      .from("signatures")
      .select("*, document_signers!inner(document_id)")
      .eq("document_signers.document_id", documentId),
    supabase.from("document_signers").select("id, signed_at, name").eq("document_id", documentId),
  ]);
  if (fieldsRes.error) throw new Error(`Failed to load document fields: ${fieldsRes.error.message}`);
  if (signaturesRes.error) throw new Error(`Failed to load signatures: ${signaturesRes.error.message}`);
  return {
    fields: (fieldsRes.data || []) as FieldRow[],
    signatures: ((signaturesRes.data || []) as unknown as SigRow[]),
    signers: ((signersRes.data || []) as SignerRow[]),
  };
}

/**
 * Generates a signed PDF with all fields/signatures embedded.
 * Returns the PDF as Uint8Array.
 */
export async function generateSignedPdf(
  documentId: string,
  filePath: string,
  options: SignedPdfOptions = {}
): Promise<Uint8Array> {
  const { includeTimestamp = true } = options;
  const sb = options.client ?? supabase;

  // 1. Fetch original PDF — use service-role edge function when an access
  //    token is provided (anon signers can't read storage directly).
  let signedUrl: string | null = null;
  if (options.accessToken) {
    const { data, error } = await supabase.functions.invoke("get-signing-pdf", {
      body: { token: options.accessToken, variant: "original" },
    });
    if (error || !data?.signedUrl) throw error || new Error("Failed to create download URL");
    signedUrl = data.signedUrl;
  } else {
    const { data: urlData, error: urlErr } = await sb.storage
      .from("documents")
      .createSignedUrl(filePath, 60);
    if (urlErr || !urlData?.signedUrl) throw urlErr || new Error("Failed to create download URL");
    signedUrl = urlData.signedUrl;
  }
  const pdfBytes = await fetch(signedUrl).then((r) => r.arrayBuffer());

  // 2. Fetch fields, signatures, and signers (for timestamps)
  const { fields, signatures, signers } = await loadRenderData(documentId, options);

  // Build signer_id -> signature image_data map
  const signerSignatureMap = new Map<string, string>();
  for (const sig of signatures) {
    signerSignatureMap.set(sig.signer_id, sig.image_data);
  }
  // Build signer_id -> { signed_at, name }
  const signerInfoMap = new Map<string, { signed_at: string | null; name: string }>();
  for (const s of signers) {
    signerInfoMap.set(s.id, { signed_at: s.signed_at, name: s.name });
  }

  // 3. Embed fields into PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  // Device timezone abbreviation (e.g. EST, PST, CET)
  let tzAbbr = "";
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date());
    tzAbbr = parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch { /* ignore */ }

  const formatTs = (iso: string | null | undefined) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, "0");
      const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      return `Signed: ${stamp}${tzAbbr ? " " + tzAbbr : ""}`;
    } catch {
      return null;
    }
  };

  for (const field of fields) {
    const pageIndex = (field.page_number || 1) - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();

    const pdfX = field.x / SCALE;
    const pdfY = pageHeight - field.y / SCALE - field.height / SCALE;
    const pdfW = field.width / SCALE;
    const pdfH = field.height / SCALE;

    if (field.field_type === "signature" || field.field_type === "initials") {
      const imgData = signerSignatureMap.get(field.signer_id) || field.value;
      if (!imgData) continue;

      const base64 = imgData.includes(",") ? imgData.split(",")[1] : imgData;
      const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      let image;
      try {
        image = await pdfDoc.embedPng(imgBytes);
      } catch (pngErr) {
        console.warn("PNG embed failed, trying JPEG fallback:", pngErr);
        try {
          image = await pdfDoc.embedJpg(imgBytes);
        } catch (jpgErr) {
          console.error("Both PNG and JPEG embed failed for field", field.id, jpgErr);
          continue;
        }
      }

      page.drawImage(image, { x: pdfX, y: pdfY, width: pdfW, height: pdfH });

      // Draw timestamp just below the signature box if enabled
      if (includeTimestamp) {
        const info = signerInfoMap.get(field.signer_id);
        const label = formatTs(info?.signed_at);
        if (label) {
          const fontSize = 7;
          const tsY = Math.max(pdfY - fontSize - 2, 2);
          page.drawText(label, {
            x: pdfX,
            y: tsY,
            size: fontSize,
            font,
            color: rgb(0.35, 0.35, 0.4),
          });
        }
      }
    } else if (
      field.field_type === "date" ||
      field.field_type === "text" ||
      field.field_type === "name" ||
      field.field_type === "email" ||
      field.field_type === "full_name" ||
      field.field_type === "title"
    ) {
      if (!field.value) continue;
      const size = Math.min(Math.max(8, pdfH * 0.45), 12);
      const maxW = Math.max(8, pdfW - 2);
      const lines = wrapTextToWidth(field.value, maxW, (sample) => font.widthOfTextAtSize(sample, size));
      const lineHeight = size * 1.2;
      if (lines.length <= 1) {
        const line = lines[0] || "";
        if (line) {
          page.drawText(line, {
            x: pdfX + 1,
            y: pdfY + Math.max(2, pdfH * 0.3),
            size,
            font,
            color: rgb(0, 0, 0),
          });
        }
      } else {
        lines.forEach((line, i) => {
          if (!line) return;
          const y = pdfY + pdfH - size - 1 - i * lineHeight;
          if (y < pdfY - 2) return;
          page.drawText(line, { x: pdfX + 1, y, size, font, color: rgb(0, 0, 0) });
        });
      }
    } else if (field.field_type === "checkbox" || field.field_type === "checkmark") {
      if (field.value === "true" || field.value === "checked" || field.value === "✓" || field.value === "checkmark") {
        const s = Math.min(pdfH * 0.8, 16);
        page.drawSvgPath("M 2 12 L 9 19 L 22 5", {
          x: pdfX + pdfW * 0.15,
          y: pdfY + pdfH * 0.2 + s,
          borderColor: rgb(0, 0, 0),
          borderWidth: Math.max(1.2, s / 10),
          scale: s / 24,
        });
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Generates the signed PDF, uploads it to storage, and updates the document record.
 */
export async function generateAndUploadSignedPdf(
  documentId: string,
  filePath: string,
  options: SignedPdfOptions = {}
): Promise<string> {
  const sb = options.client ?? supabase;
  const pdfData = await generateSignedPdf(documentId, filePath, options);
  const signedPath = `signed/${documentId}.pdf`;

  // When invoked by an anon signer, route uploads through a service-role
  // edge function — storage RLS doesn't honor the x-signer-token header.
  if (options.accessToken) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < pdfData.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(pdfData.subarray(i, i + chunk)) as unknown as number[]
      );
    }
    const pdfBase64 = btoa(binary);
    const { data, error } = await supabase.functions.invoke("upload-signed-pdf", {
      body: { token: options.accessToken, pdfBase64 },
    });
    if (error || !data?.ok) throw error || new Error("Failed to upload signed PDF");
    return data.path as string;
  }

  const { error: uploadErr } = await sb.storage
    .from("documents")
    .upload(signedPath, new Blob([pdfData.slice(0)], { type: "application/pdf" }), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) throw uploadErr;

  const { error: updateErr } = await sb
    .from("documents")
    .update({ signed_file_path: signedPath } as never)
    .eq("id", documentId);
  if (updateErr) throw updateErr;

  return signedPath;
}
