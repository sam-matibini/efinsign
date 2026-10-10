import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createSignerClient } from "@/integrations/supabase/signerClient";
import PdfViewer from "@/components/PdfViewer";
import SignatureCapture from "@/components/SignatureCapture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, PenTool, Type, Calendar, Hash, Check, ArrowDown, Send, User, Briefcase, Download } from "lucide-react";
import efinsignLogo from "@/assets/efinsign-logo.png";
import CelebrationConfetti from "@/components/CelebrationConfetti";
import type { Tables } from "@/integrations/supabase/types";
import { generateAndUploadSignedPdf } from "@/lib/pdfRenderer";
import { closeSigningWindow } from "@/lib/closeSigningWindow";
import FieldFormatBar from "@/components/FieldFormatBar";
import { decodeFieldValue, encodeFieldValue, EMPTY_FIELD_STYLE, type FieldStyle } from "@/lib/fieldStyle";
import { format } from "date-fns";
import { fontSizeForFieldHeight } from "@/lib/fieldFont";
import { checkAppearance, checkGlyph } from "@/lib/checkStyles";
import { companySealDataUrl } from "@/lib/companySeals";
import { isSealField, sealFromField } from "@/lib/documentFields";

type FieldWithValue = Tables<"document_fields"> & { localValue?: string };

export default function Sign() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // Token-scoped Supabase client (sends `x-signer-token` header so RLS
  // policies can verify the caller is the actual signer).
  const sb = useMemo(() => (token ? createSignerClient(token) : supabase), [token]);



  const [doc, setDoc] = useState<Tables<"documents"> | null>(null);
  const [signer, setSigner] = useState<Tables<"document_signers"> | null>(null);
  const [fields, setFields] = useState<FieldWithValue[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [consented, setConsented] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [senderLabel, setSenderLabel] = useState<string | null>(null);

  // Dialog states
  const [activeField, setActiveField] = useState<FieldWithValue | null>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textInputValue, setTextInputValue] = useState("");
  const [textStyle, setTextStyle] = useState<FieldStyle>(EMPTY_FIELD_STYLE);

  // Guided navigation state
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);

  // Sorted fields for sequential navigation
  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.page_number - b.page_number || a.y - b.y || a.x - b.x),
    [fields]
  );

  // Next unfilled field
  const fieldIsFilled = (f: FieldWithValue) => (
    f.field_type === "checkmark" || f.field_type === "checkbox"
      ? checkAppearance(f.localValue).filled
      : !!f.localValue
  );

  const nextUnfilledField = useMemo(
    () => sortedFields.find(f => !fieldIsFilled(f)),
    [sortedFields]
  );

  const loadSigningData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setQueryError(null);

    // Clear any stale local session to prevent invalid JWT errors for anonymous signer access
    // Use local scope only to avoid network calls that might fail
    try {
      localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_PROJECT_ID + '-auth-token');
    } catch { /* ignore */ }

    let signerData: Tables<"document_signers"> | null = null;
    const { data, error: signerError } = await sb
      .from("document_signers")
      .select("*")
      .eq("access_token", token)
      .maybeSingle();
    signerData = data;

    if (signerError) {
      console.error("Signer lookup failed:", signerError);
      setQueryError(signerError.message || "Failed to load signing data. Please try again.");
      setLoading(false);
      return;
    }

    if (!signerData) { setLoading(false); return; }

    if (signerData.expires_at && new Date(signerData.expires_at) < new Date()) {
      setLoading(false);
      return;
    }

    setSigner(signerData);

    const documentId = signerData.document_id;

    const [docRes, fieldsRes] = await Promise.all([
      sb.from("documents").select("*").eq("id", documentId).single(),
      sb.from("document_fields").select("*").eq("document_id", documentId).eq("signer_id", signerData.id),
    ]);

    if (docRes.error) console.error("Document fetch failed:", docRes.error);
    if (fieldsRes.error) console.error("Fields fetch failed:", fieldsRes.error);

    if (docRes.data) {
      setDoc(docRes.data);
      if (docRes.data.organization_id) {
        sb.from("organizations").select("name").eq("id", docRes.data.organization_id).maybeSingle()
          .then(({ data }) => { if (data?.name) setSenderLabel(data.name); });
      }
      if (docRes.data.file_path) {
        setPdfLoading(true);
        setPdfError(null);
        const { data: urlData, error: urlErr } = await supabase.functions.invoke("get-signing-pdf", {
          body: { token, variant: "original" },
        });
        if (urlErr || !urlData?.signedUrl) {
          console.error("get-signing-pdf failed:", urlErr);
          setPdfError(urlErr?.message || "Could not load document preview.");
          setPdfLoading(false);
        } else {
          try {
            const resp = await fetch(urlData.signedUrl);
            const blob = await resp.blob();
            setPdfUrl(URL.createObjectURL(blob));
          } catch (e: any) {
            setPdfError(e?.message || "Failed to download document preview.");
          } finally {
            setPdfLoading(false);
          }
        }
      }
    }
    setFields((fieldsRes.data || []).map(f => {
      let localValue = f.value || undefined;
      if (!localValue && f.field_type === "full_name" && signerData.name) {
        localValue = signerData.name;
      }
      return { ...f, localValue };
    }));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadSigningData();
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [token]);

  // On initial load, highlight the first unfilled field
  useEffect(() => {
    if (!loading && nextUnfilledField && !highlightedFieldId) {
      setHighlightedFieldId(nextUnfilledField.id);
    }
  }, [loading, nextUnfilledField, highlightedFieldId]);

  const scrollToField = useCallback((fieldId: string) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-field-id="${fieldId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  }, []);

  const advanceToNextUnfilled = useCallback((afterFieldId?: string) => {
    // Find next unfilled field after the given one, or the first unfilled overall
    const sorted = [...fields].sort((a, b) => a.page_number - b.page_number || a.y - b.y || a.x - b.x);
    let startIdx = 0;
    if (afterFieldId) {
      const idx = sorted.findIndex(f => f.id === afterFieldId);
      if (idx >= 0) startIdx = idx + 1;
    }
    // Look from startIdx forward, then wrap around
    for (let i = 0; i < sorted.length; i++) {
      const f = sorted[(startIdx + i) % sorted.length];
      if (!fieldIsFilled(f)) {
        setHighlightedFieldId(f.id);
        scrollToField(f.id);
        return;
      }
    }
    // All filled
    setHighlightedFieldId(null);
  }, [fields, scrollToField]);

  const updateFieldValue = useCallback((fieldId: string, value: string) => {
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, localValue: value } : f));
  }, []);

  const handleFieldClick = useCallback((field: FieldWithValue) => {
    const type = field.field_type;
    setActiveField(field);
    setHighlightedFieldId(field.id);

    if (isSealField({ field_type: field.field_type, value: field.localValue || field.value })) {
      return;
    }
    if (type === "signature" || type === "initials") {
      setSignatureDialogOpen(true);
    } else if (type === "date") {
      const today = format(new Date(), "yyyy-MM-dd");
      updateFieldValue(field.id, today);
      // Auto-advance after date fill
      setTimeout(() => advanceToNextUnfilled(field.id), 300);
    } else if (type === "checkmark" || type === "checkbox") {
      const appearance = checkAppearance(field.localValue);
      updateFieldValue(field.id, appearance.filled ? "" : appearance.style);
      // Auto-advance after toggle
      setTimeout(() => advanceToNextUnfilled(field.id), 300);
    } else {
      const decoded = decodeFieldValue(field.localValue || (type === "full_name" ? signer?.name || "" : ""));
      setTextInputValue(decoded.text);
      setTextStyle({ ...EMPTY_FIELD_STYLE, ...decoded.style });
      setTextDialogOpen(true);
    }
  }, [updateFieldValue, advanceToNextUnfilled, signer]);

  const handleSignatureSave = useCallback((imageData: string) => {
    if (activeField) {
      updateFieldValue(activeField.id, imageData);
      // Auto-advance after signature save
      setTimeout(() => advanceToNextUnfilled(activeField.id), 300);
    }
    setSignatureDialogOpen(false);
    setActiveField(null);
  }, [activeField, updateFieldValue, advanceToNextUnfilled]);

  const handleTextSave = useCallback(() => {
    if (activeField && textInputValue.trim()) {
      updateFieldValue(activeField.id, encodeFieldValue(textInputValue.trim(), textStyle));
      // Auto-advance after text save
      setTimeout(() => advanceToNextUnfilled(activeField.id), 300);
    }
    setTextDialogOpen(false);
    setActiveField(null);
    setTextInputValue("");
  }, [activeField, textInputValue, updateFieldValue, advanceToNextUnfilled]);

  const handleNextClick = useCallback(() => {
    if (nextUnfilledField) {
      setHighlightedFieldId(nextUnfilledField.id);
      scrollToField(nextUnfilledField.id);
      // Auto-open the field's input after scrolling
      setTimeout(() => handleFieldClick(nextUnfilledField), 400);
    }
  }, [nextUnfilledField, scrollToField, handleFieldClick]);

  const REQUIRED_TYPES = ["signature", "initials", "name", "date", "full_name", "title"];
  const filledCount = fields.filter(fieldIsFilled).length;
  const totalCount = fields.length;
  const requiredFields = fields.filter(f => REQUIRED_TYPES.includes(f.field_type));
  const unfilledRequired = requiredFields.filter(f => !fieldIsFilled(f));
  const allRequiredFilled = unfilledRequired.length === 0;
  const allFieldsFilled = fields.every(fieldIsFilled);

  const notifyOwner = useCallback(async (documentId: string, signerName: string, signerEmail: string, filledFields: FieldWithValue[]) => {
    try {
      const fieldsSummary = filledFields
        .filter(f => !!f.localValue)
        .map(f => ({
          type: f.field_type,
          value: (f.field_type === "signature" || f.field_type === "initials") ? "Signed" : f.localValue!,
        }));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      fetch(`${supabaseUrl}/functions/v1/notify-owner-signed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ document_id: documentId, signer_name: signerName, signer_email: signerEmail, fields_summary: fieldsSummary }),
      }).catch(err => console.error("Notification failed:", err));
    } catch (err) {
      console.error("Failed to send owner notification:", err);
    }
  }, []);

  const handleSubmit = async () => {
    if (!signer) return;

    if (unfilledRequired.length > 0) {
      const missing = [...new Set(unfilledRequired.map(f => f.field_type))].join(", ");
      toast.error(`Please fill all required fields: ${missing}`);
      return;
    }

    setSubmitting(true);
    const documentId = signer.document_id;

    try {
      for (const field of fields) {
        if (field.localValue) {
          const { error: fieldErr } = await supabase
            .from("document_fields")
            .update({ value: field.localValue })
            .eq("id", field.id);
          if (fieldErr) throw new Error(`Saving field failed: ${fieldErr.message}`);
        }
      }

      const sigField = fields.find(f => f.field_type === "signature" && f.localValue);
      if (sigField) {
        const { error: sigErr } = await sb.from("signatures").insert({
          signer_id: signer.id,
          image_data: sigField.localValue!,
        });
        if (sigErr) throw new Error(`Saving signature failed: ${sigErr.message}`);
      }

      const { error: signerErr } = await sb.from("document_signers").update({
        status: "signed",
        signed_at: new Date().toISOString(),
      }).eq("id", signer.id);
      if (signerErr) throw new Error(`Updating signer failed: ${signerErr.message}`);

      await sb.from("audit_logs").insert({
        document_id: documentId,
        event_type: "signed",
        actor_email: signer.email,
      });

      // Trigger on document_signers auto-marks the document 'completed'
      // when this was the last pending signer. Re-read to decide whether
      // to generate the final signed PDF.
      const { data: docAfter } = await sb
        .from("documents")
        .select("status, file_path")
        .eq("id", documentId)
        .maybeSingle();

      if (docAfter?.status === "completed") {
        if (docAfter.file_path) {
          try {
            await generateAndUploadSignedPdf(documentId, docAfter.file_path, {
              includeTimestamp,
              client: sb,
              accessToken: token ?? undefined,
            });
          } catch (err: any) {
            console.error("Failed to generate signed PDF:", err);
            toast.error(`Signed copy could not be finalized: ${err?.message || "unknown error"}`);
          }
        }
        // Fire-and-forget: send signed copy to all signers
        sb.functions.invoke("send-signed-copy", {
          body: { document_id: documentId },
        }).catch(err => console.error("Failed to send signed copies:", err));
      }

      notifyOwner(documentId, signer.name, signer.email, fields);
      setSigned(true);
    } catch (err: any) {
      console.error("Signature submit failed:", err);
      const detail = err?.message || err?.error_description || (typeof err === "string" ? err : "");
      toast.error(detail ? `Failed to submit signature: ${detail}` : "Failed to submit signature. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!signer) return;
    const reason = prompt("Please provide a reason for declining:");
    if (!reason) return;
    const documentId = signer.document_id;

    await sb.from("document_signers").update({
      status: "declined",
      decline_reason: reason,
    }).eq("id", signer.id);

    // Trigger on document_signers auto-marks the document as 'declined'.
    await sb.from("audit_logs").insert({
      document_id: documentId,
      event_type: "declined",
      actor_email: signer.email,
      details: { reason } as any,
    });
    setDeclined(true);
  };

  // Render field overlays on the PDF
  const renderPageOverlay = useCallback((pageNumber: number) => {
    const pageFields = fields.filter(f => f.page_number === pageNumber);
    if (pageFields.length === 0) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {pageFields.map(field => {
          const isSignatureType = field.field_type === "signature" || field.field_type === "initials";
          const isCheckType = field.field_type === "checkmark" || field.field_type === "checkbox";
          const placedSeal = sealFromField({ field_type: field.field_type, value: field.localValue || field.value });
          const asSeal = isSealField({ field_type: field.field_type, value: field.localValue || field.value });
          const checkState = isCheckType ? checkAppearance(field.localValue) : null;
          const filled = checkState ? checkState.filled : !!field.localValue;
          const isRequired = REQUIRED_TYPES.includes(field.field_type);
          const isUnfilledRequired = isRequired && !filled;
          const isHighlighted = highlightedFieldId === field.id;

          return (
            <div
              key={field.id}
              data-field-id={field.id}
              className={`absolute pointer-events-auto cursor-pointer transition-all group ${
                filled
                  ? "border-2 border-green-500 bg-green-50/30"
                  : isHighlighted
                    ? "border-2 border-primary bg-primary/10 ring-2 ring-primary ring-offset-1 shadow-lg z-10"
                    : isUnfilledRequired
                      ? "border-2 border-dashed border-destructive/60 bg-destructive/5"
                      : "border-2 border-dashed border-muted-foreground/40 bg-muted/20"
              }`}
              style={{
                left: field.x,
                top: field.y,
                width: field.width,
                height: field.height,
                borderColor: filled ? undefined : isHighlighted ? undefined : signer?.color || undefined,
              }}
              onClick={() => handleFieldClick(field)}
              title={`Click to fill ${asSeal ? "seal" : field.field_type}`}
            >
              {/* Content */}
              {filled ? (
                asSeal && placedSeal ? (
                  <img
                    src={companySealDataUrl(placedSeal.id)}
                    alt={placedSeal.legalName}
                    className="w-full h-full object-contain"
                  />
                ) : isSignatureType ? (
                  <img
                    src={field.localValue!}
                    alt={field.field_type}
                    className="w-full h-full object-contain"
                  />
                ) : isCheckType ? (
                  <div className="w-full h-full flex items-center justify-center font-bold text-green-700" style={{ fontSize: fontSizeForFieldHeight(field.height) }}>
                    {checkGlyph(checkState?.style || "check")}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-start px-1 overflow-hidden">
                    <span className="text-foreground whitespace-pre-wrap break-words leading-tight" style={{ fontSize: fontSizeForFieldHeight(field.height) }}>{field.localValue}</span>
                  </div>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center gap-1 opacity-70">
                  {getFieldIcon(asSeal ? "seal" : field.field_type)}
                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: isHighlighted ? undefined : signer?.color || undefined }}>
                    {asSeal ? "seal" : field.field_type}
                  </span>
                </div>
              )}

              {/* Filled checkmark */}
              {filled && !isCheckType && (
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Highlighted arrow indicator */}
              {isHighlighted && !filled && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                  <ArrowDown className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [fields, signer, handleFieldClick, highlightedFieldId]);

  // Status screens
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;

  if (!signer) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-border/50 bg-card/80 text-center">
        <CardContent className="py-12">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          {queryError ? (
            <>
              <h1 className="text-2xl font-display font-bold mb-2">Something Went Wrong</h1>
              <p className="text-muted-foreground">We couldn't load the signing data. This may be a temporary issue.</p>
              <Button className="mt-4" onClick={loadSigningData}>Try Again</Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold mb-2">Invalid or Expired Link</h1>
              <p className="text-muted-foreground">This signing link is no longer valid.</p>
              <p className="text-sm text-muted-foreground mt-2">Signing links expire after 7 days. Please contact the sender for a new link.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (signer.status === "signed" || signed) {
    const downloadSignedPdf = async () => {
      try {
        const { data: docData } = await sb
          .from("documents")
          .select("title, file_path, signed_file_path, status")
          .eq("id", signer.document_id)
          .maybeSingle();

        // If the signed file isn't there yet but the document is completed,
        // try to generate it on the fly before downloading.
        if (
          docData?.status === "completed" &&
          !docData?.signed_file_path &&
          docData?.file_path &&
          token
        ) {
          try {
            await generateAndUploadSignedPdf(signer.document_id, docData.file_path, {
              includeTimestamp,
              client: sb,
              accessToken: token,
            });
          } catch (e) {
            console.error("On-demand signed PDF generation failed:", e);
          }
        }

        let urlResp = await supabase.functions.invoke("get-signing-pdf", {
          body: { token, variant: "signed" },
        });
        // Fallback: regenerate then retry once
        if ((urlResp.error || !urlResp.data?.signedUrl) && docData?.file_path && token) {
          try {
            await generateAndUploadSignedPdf(signer.document_id, docData.file_path, {
              includeTimestamp,
              client: sb,
              accessToken: token,
            });
            urlResp = await supabase.functions.invoke("get-signing-pdf", {
              body: { token, variant: "signed" },
            });
          } catch (e: any) {
            throw new Error(e?.message || "Failed to regenerate signed PDF");
          }
        }
        if (urlResp.error || !urlResp.data?.signedUrl) {
          throw new Error(urlResp.error?.message || "Failed to create download URL");
        }

        const resp = await fetch(urlResp.data.signedUrl);
        if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${docData?.title || urlResp.data.title || "document"}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err: any) {
        toast.error(err.message || "Failed to download document");
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <CelebrationConfetti />
        <Card className="max-w-md w-full border-border/50 bg-card/80 text-center">
          <CardContent className="py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold mb-2">Document Signed!</h1>
            <p className="text-muted-foreground">Thank you. All parties will be notified.</p>
            <p className="text-sm text-muted-foreground mt-2">A signed copy has been sent to your email.</p>
            <div className="flex flex-col items-center gap-3 mt-6">
              <Button size="lg" variant="outline" onClick={downloadSignedPdf} className="gap-2">
                <Download className="h-4 w-4" /> Download Signed Copy
              </Button>
              <Button
                size="lg"
                onClick={() => closeSigningWindow()}
              >
                😊 Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-border/50 bg-card/80 text-center">
          <CardContent className="py-12">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold mb-2">Signing Declined</h1>
            <p className="text-muted-foreground">The document owner has been notified. You can close this tab.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reviewed) {
    return (
      <div className="min-h-screen bg-background pb-12">
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <img src={efinsignLogo} alt="eFinSign" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display font-bold text-lg">eFinSign</span>
          </div>

          <div>
            <h1 className="text-2xl font-display font-bold">{doc?.title}</h1>
            <p className="text-muted-foreground">
              Hello {signer?.name}, please review the document below before signing.
            </p>
          </div>

          <Card className="bg-card/60 border-border/50">
            <CardContent className="py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Fields to complete</p>
                <p className="font-medium">{totalCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{doc?.status ?? "—"}</p>
              </div>
              {senderLabel && (
                <div>
                  <p className="text-muted-foreground">Sent by</p>
                  <p className="font-medium truncate">{senderLabel}</p>
                </div>
              )}
              {signer?.expires_at && (
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-medium">{format(new Date(signer.expires_at), "PP")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/50 overflow-hidden">
            <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>Document preview — scroll to read all pages</span>
            </div>
            <div className="h-[70vh] overflow-auto bg-muted/20">
              {pdfUrl ? (
                <PdfViewer url={pdfUrl} className="w-full h-full" />
              ) : pdfLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Loading document preview…
                </div>
              ) : pdfError ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                  <p className="text-sm text-muted-foreground">{pdfError}</p>
                  <Button size="sm" variant="outline" onClick={loadSigningData}>Retry</Button>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No document preview available.
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-card/60 border-border/50">
            <CardContent className="py-4 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                />
                <span className="text-sm">
                  I have reviewed this document and agree to electronically sign it.
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1"
                  disabled={!consented}
                  onClick={async () => {
                    if (!pdfUrl) {
                      const ok = window.confirm(
                        "The document preview failed to load. Continue to signing anyway?"
                      );
                      if (!ok) return;
                    }
                    if (signer) {
                      try {
                        await sb.from("audit_logs").insert({
                          document_id: signer.document_id,
                          event_type: "reviewed",
                          actor_email: signer.email,
                        });
                      } catch {}
                    }
                    setReviewed(true);
                  }}
                >
                  Start signing
                </Button>
                <Button variant="outline" onClick={handleDecline}>
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={efinsignLogo} alt="eFinSign" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display font-bold text-lg">eFinSign</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setReviewed(false)}>
            Back to review
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-display font-bold">{doc?.title}</h1>
          <p className="text-muted-foreground">Hello {signer.name}, please review and fill all fields below, then submit.</p>
        </div>

        {/* Progress */}
        {totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{filledCount} of {totalCount} fields completed</span>
              <span className="font-medium">{Math.round((filledCount / totalCount) * 100)}%</span>
            </div>
            <Progress value={(filledCount / totalCount) * 100} className="h-2" />
          </div>
        )}

        {/* Timestamp preference */}
        <Card className="bg-card/40 border-border/50">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="ts-toggle-top" className="text-sm font-medium cursor-pointer">
                  Include signing timestamp
                </Label>
                <p className="text-xs text-muted-foreground">Adds the date and time below your signature in the final PDF.</p>
              </div>
            </div>
            <Switch id="ts-toggle-top" checked={includeTimestamp} onCheckedChange={setIncludeTimestamp} />
          </CardContent>
        </Card>

        {/* PDF with field overlays */}
        {pdfUrl && (
          <Card className="bg-card/60 border-border/50 overflow-hidden">
            <PdfViewer
              url={pdfUrl}
              className="w-full"
              renderPageOverlay={renderPageOverlay}
              nextTagLabel="Next"
              onNextFromPage={(pageNumber) => {
                if (nextUnfilledField && nextUnfilledField.page_number > pageNumber) {
                  setHighlightedFieldId(nextUnfilledField.id);
                  scrollToField(nextUnfilledField.id);
                  return;
                }
                document.querySelector(`[data-page="${pageNumber + 1}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          </Card>
        )}

        {/* If no fields placed, show standalone signature capture */}
        {totalCount === 0 && (
          <Card className="bg-card/60 border-border/50">
            <CardHeader>
              <CardTitle className="font-display">Your Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <SignatureCapture
                saveLabel="Sign Document"
                onSave={async (sigData) => {
                  if (!signer) return;
                  const documentId = signer.document_id;
                  try {
                    await sb.from("signatures").insert({ signer_id: signer.id, image_data: sigData });
                    await sb.from("document_signers").update({ status: "signed", signed_at: new Date().toISOString() }).eq("id", signer.id);
                    await sb.from("audit_logs").insert({ document_id: documentId, event_type: "signed", actor_email: signer.email });
                    const { data: docAfter } = await sb.from("documents").select("status, file_path").eq("id", documentId).maybeSingle();
                    if (docAfter?.status === "completed" && docAfter.file_path) {
                      try {
                        await generateAndUploadSignedPdf(documentId, docAfter.file_path, {
                          includeTimestamp,
                          client: sb,
                          accessToken: token ?? undefined,
                        });
                      } catch {}
                    }
                    notifyOwner(documentId, signer.name, signer.email, []);
                    setSigned(true);
                  } catch (err: any) { toast.error(err.message); }
                }}
              />
            </CardContent>
          </Card>
        )}

        {totalCount === 0 && (
          <Button variant="outline" onClick={handleDecline}>
            Decline
          </Button>
        )}
      </div>

      {/* Sticky bottom navigation bar */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border shadow-lg z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {allFieldsFilled ? (
                <p className="text-sm font-medium text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  All fields complete — ready to submit
                </p>
              ) : nextUnfilledField ? (
                <p className="text-sm text-muted-foreground truncate">
                  Next: <span className="font-medium text-foreground capitalize">{nextUnfilledField.field_type}</span> on page {nextUnfilledField.page_number}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-border">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="ts-toggle" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  Timestamp
                </Label>
                <Switch id="ts-toggle" checked={includeTimestamp} onCheckedChange={setIncludeTimestamp} />
              </div>
              <Button variant="outline" size="sm" onClick={handleDecline}>
                Decline
              </Button>
              {allFieldsFilled && allRequiredFilled ? (
                <Button onClick={handleSubmit} disabled={submitting} size="sm" className="gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Submitting..." : "Sign & Submit"}
                </Button>
              ) : (
                <Button onClick={handleNextClick} size="sm" className="gap-1.5">
                  Next
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signature/Initials Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={(open) => { if (!open) { setSignatureDialogOpen(false); setActiveField(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeField?.field_type === "initials" ? "Your Initials" : "Your Signature"}</DialogTitle>
          </DialogHeader>
          <SignatureCapture
            saveLabel={activeField?.field_type === "initials" ? "Save Initials" : "Save Signature"}
            onSave={handleSignatureSave}
            onCancel={() => { setSignatureDialogOpen(false); setActiveField(null); }}
            compact
          />
        </DialogContent>
      </Dialog>

      {/* Text Input Dialog */}
      <Dialog open={textDialogOpen} onOpenChange={(open) => { if (!open) { setTextDialogOpen(false); setActiveField(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter {getFieldLabel(activeField?.field_type)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FieldFormatBar style={textStyle} onChange={setTextStyle} />
            <Textarea
              autoFocus
              rows={3}
              placeholder={getFieldPlaceholder(activeField?.field_type)}
              value={textInputValue}
              onChange={e => setTextInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSave(); } }}
              className="whitespace-pre-wrap break-words"
              style={{
                fontFamily: textStyle.fontFamily,
                fontWeight: textStyle.bold ? 700 : 400,
                fontStyle: textStyle.italic ? "italic" : "normal",
                textDecoration: [textStyle.underline ? "underline" : "", textStyle.strikethrough ? "line-through" : ""].filter(Boolean).join(" ") || undefined,
                color: textStyle.color,
                backgroundColor: textStyle.backgroundColor && textStyle.backgroundColor !== "none" ? textStyle.backgroundColor : undefined,
                textAlign: textStyle.align,
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setTextDialogOpen(false); setActiveField(null); }}>Cancel</Button>
              <Button onClick={handleTextSave} disabled={!textInputValue.trim()}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getFieldIcon(type: string) {
  switch (type) {
    case "signature": return <PenTool className="h-3 w-3" />;
    case "initials": return <Hash className="h-3 w-3" />;
    case "full_name": return <User className="h-3 w-3" />;
    case "title": return <Briefcase className="h-3 w-3" />;
    case "date": return <Calendar className="h-3 w-3" />;
    case "text": case "name": case "email": return <Type className="h-3 w-3" />;
    case "checkmark": case "checkbox": return <Check className="h-3 w-3" />;
    default: return <Type className="h-3 w-3" />;
  }
}

function getFieldLabel(type?: string): string {
  switch (type) {
    case "full_name": return "Full Name";
    case "title": return "Title";
    default: return type || "text";
  }
}

function getFieldPlaceholder(type?: string): string {
  switch (type) {
    case "full_name": return "Enter your full name...";
    case "title": return "Enter your title...";
    default: return `Enter ${type || "text"}...`;
  }
}
