import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { wrapTextToWidth } from "@/lib/textWrap";
import { pdfFontSizeForField } from "@/lib/fieldFont";
import { checkAppearance } from "@/lib/checkStyles";
import { companySealSvg, sealByStampLabel, svgToPngBytes } from "@/lib/companySeals";
import { drawCheckOnPage } from "@/components/pdf-editor/savePdfDocument";
import { editorFontPdf } from "@/lib/editorFonts";
import { decodeFieldValue } from "@/lib/fieldStyle";
import { alignedLineX } from "@/lib/textLayout";
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
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const courierOblique = await pdfDoc.embedFont(StandardFonts.CourierOblique);
  const courierBoldOblique = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
  const pickFieldFont = (family?: string, bold?: boolean, italic?: boolean) => {
    const pdf = editorFontPdf(family);
    if (pdf === "times") {
      if (bold && italic) return timesBoldItalic;
      if (italic) return timesItalic;
      return bold ? timesBold : times;
    }
    if (pdf === "courier") {
      if (bold && italic) return courierBoldOblique;
      if (italic) return courierOblique;
      return bold ? courierBold : courier;
    }
    if (bold && italic) return helveticaBoldOblique;
    if (italic) return helveticaOblique;
    return bold ? helveticaBold : font;
  };
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

    if (field.field_type === "seal") {
      const seal = sealByStampLabel(field.value);
      if (!seal) continue;
      const png = await svgToPngBytes(companySealSvg(seal.id));
      const sealImage = await pdfDoc.embedPng(png);
      page.drawImage(sealImage, { x: pdfX, y: pdfY, width: pdfW, height: pdfH });
      continue;
    }

    if (field.field_type === "signature" || field.field_type === "initials") {
      const imgData = signerSignatureMap.get(field.signer_id) || field.value;
      if (!imgData) continue;

      const imgBytes = imgData.startsWith("data:image/svg")
        ? await svgToPngBytes(decodeURIComponent(imgData.split(",")[1] || ""))
        : Uint8Array.from(atob(imgData.includes(",") ? imgData.split(",")[1] : imgData), (c) => c.charCodeAt(0));

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
      const decoded = decodeFieldValue(field.value);
      if (!decoded.text) continue;
      const size = pdfFontSizeForField(pdfH);
      const maxW = Math.max(8, pdfW - 2);
      const textFont = pickFieldFont(decoded.style.fontFamily, decoded.style.bold, decoded.style.italic);
      const hex = decoded.style.color && /^#[0-9a-fA-F]{6}$/.test(decoded.style.color) ? decoded.style.color : "#000000";
      const color = rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
      if (decoded.style.backgroundColor && /^#[0-9a-fA-F]{6}$/.test(decoded.style.backgroundColor)) {
        const bg = decoded.style.backgroundColor;
        page.drawRectangle({
          x: pdfX, y: pdfY, width: pdfW, height: pdfH,
          color: rgb(parseInt(bg.slice(1, 3), 16) / 255, parseInt(bg.slice(3, 5), 16) / 255, parseInt(bg.slice(5, 7), 16) / 255),
          borderWidth: 0,
        });
      }
      const lines = wrapTextToWidth(decoded.text, maxW, (sample) => textFont.widthOfTextAtSize(sample, size));
      const lineHeight = size * (decoded.style.lineHeight ?? 1.2);
      lines.forEach((line, i) => {
        if (!line) return;
        const lineWidth = textFont.widthOfTextAtSize(line, size);
        const x = alignedLineX(pdfX + 1, maxW, lineWidth, decoded.style.align ?? "left");
        const y = lines.length <= 1
          ? pdfY + Math.max(2, pdfH * 0.3)
          : pdfY + pdfH - size - 1 - i * lineHeight;
        if (y < pdfY - 2) return;
        page.drawText(line, { x, y, size, font: textFont, color });
        if (decoded.style.underline) {
          page.drawLine({ start: { x, y: y - size * 0.12 }, end: { x: x + lineWidth, y: y - size * 0.12 }, color, thickness: Math.max(0.5, size * 0.06) });
        }
        if (decoded.style.strikethrough) {
          page.drawLine({ start: { x, y: y + size * 0.28 }, end: { x: x + lineWidth, y: y + size * 0.28 }, color, thickness: Math.max(0.5, size * 0.06) });
        }
      });
    } else if (field.field_type === "checkbox" || field.field_type === "checkmark") {
      const appearance = checkAppearance(field.value);
      if (appearance.filled || field.field_type === "checkbox" && (field.value === "true" || field.value === "checked")) {
        const s = Math.min(pdfH * 0.8, 22);
        drawCheckOnPage(page, appearance.style, pdfX + pdfW * 0.1, pdfY + pdfH * 0.15 + s, s);
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
