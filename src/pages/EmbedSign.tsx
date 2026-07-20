import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createSignerClient } from "@/integrations/supabase/signerClient";
import PdfViewer from "@/components/PdfViewer";
import SignatureCapture from "@/components/SignatureCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, PenTool, Type, Calendar, Check, Hash, User, Briefcase, Send } from "lucide-react";
import CelebrationConfetti from "@/components/CelebrationConfetti";
import type { Tables } from "@/integrations/supabase/types";
import { generateAndUploadSignedPdf } from "@/lib/pdfRenderer";
import { format } from "date-fns";
import { EmbedProvider, useEmbed } from "@/components/embed/EmbedProvider";
import { useEmbedConfig } from "@/components/embed/EmbedConfig";

type FieldWithValue = Tables<"document_fields"> & { localValue?: string };

function EmbedSignInner() {
  const { postMessage } = useEmbed();
  const { primaryColor } = useEmbedConfig();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const sb = useMemo(() => (token ? createSignerClient(token) : supabase), [token]);

  const [doc, setDoc] = useState<Tables<"documents"> | null>(null);
  const [signer, setSigner] = useState<Tables<"document_signers"> | null>(null);
  const [fields, setFields] = useState<FieldWithValue[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [consented, setConsented] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [activeField, setActiveField] = useState<FieldWithValue | null>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textInputValue, setTextInputValue] = useState("");

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.page_number - b.page_number || a.y - b.y || a.x - b.x),
    [fields],
  );

  const nextUnfilledField = useMemo(
    () => sortedFields.find((f) => !f.localValue),
    [sortedFields],
  );

  const filledCount = useMemo(
    () => fields.filter((f) => f.localValue).length,
    [fields],
  );

  const progressPercent = fields.length > 0 ? Math.round((filledCount / fields.length) * 100) : 0;

  const loadSigningData = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);

    try {
      localStorage.removeItem("sb-" + import.meta.env.VITE_SUPABASE_PROJECT_ID + "-auth-token");
    } catch { /* ignore */ }

    const { data: signerData, error: signerError } = await sb
      .from("document_signers")
      .select("*")
      .eq("access_token", token)
      .maybeSingle();

    if (signerError || !signerData) { setLoading(false); return; }
    if (signerData.expires_at && new Date(signerData.expires_at) < new Date()) { setLoading(false); return; }

    if (signerData.status === "signed") {
      setSigned(true);
      setSigner(signerData);
      setLoading(false);
      return;
    }

    setSigner(signerData);

    const documentId = signerData.document_id;

    const [docRes, fieldsRes] = await Promise.all([
      sb.from("documents").select("*").eq("id", documentId).single(),
      sb.from("document_fields").select("*").eq("document_id", documentId).eq("signer_id", signerData.id),
    ]);

    if (docRes.data) {
      setDoc(docRes.data);
      if (docRes.data.file_path) {
        setPdfLoading(true);
        const { data: urlData } = await supabase.functions.invoke("get-signing-pdf", {
          body: { token, variant: "original" },
        });
        if (urlData?.signedUrl) {
          setPdfUrl(urlData.signedUrl);
        } else {
          setPdfError("Could not load document preview.");
        }
        setPdfLoading(false);
      }
    }

    if (fieldsRes.data) {
      const fvs: FieldWithValue[] = (fieldsRes.data || []).map((f: Tables<"document_fields">) => ({
        ...f,
        localValue: f.value || undefined,
      }));
      setFields(fvs);
    }

    setLoading(false);
    postMessage("EFINSIGN_SIGNER_VIEWED", { signer: { name: signerData.name, email: signerData.email } });
  }, [token, sb, postMessage]);

  useEffect(() => { loadSigningData(); }, [loadSigningData]);

  const openField = useCallback((field: FieldWithValue) => {
    setActiveField(field);
    if (field.field_type === "signature" || field.field_type === "initials") {
      setSignatureDialogOpen(true);
    } else {
      setTextInputValue(field.localValue || "");
      setTextDialogOpen(true);
    }
  }, []);

  const handleSignatureSave = useCallback((imageData: string) => {
    if (!activeField) return;
    setFields((prev) =>
      prev.map((f) => (f.id === activeField.id ? { ...f, localValue: imageData } : f)),
    );
    setSignatureDialogOpen(false);
    setActiveField(null);
  }, [activeField]);

  const handleTextSave = useCallback(() => {
    if (!activeField) return;
    setFields((prev) =>
      prev.map((f) => (f.id === activeField.id ? { ...f, localValue: textInputValue.trim() } : f)),
    );
    setTextDialogOpen(false);
    setActiveField(null);
  }, [activeField, textInputValue]);

  const handleSubmit = useCallback(async () => {
    if (!token || !signer || !doc) return;
    setSubmitting(true);
    try {
      const uniqueFields = fields.filter((f) => f.field_type === "signature" || f.field_type === "initials"
        ? f.localValue
        : f.localValue || "");
      const hasSignature = uniqueFields.some((f) => f.field_type === "signature" && f.localValue);

      const serializedFields = uniqueFields.map((f) => ({
        id: f.id,
        document_id: f.document_id,
        signer_id: f.signer_id || signer.id,
        field_type: f.field_type,
        page_number: f.page_number,
        x: Number(f.x),
        y: Number(f.y),
        width: Number(f.width),
        height: Number(f.height),
        value: f.localValue || "",
        label: f.label || null,
      }));

      if (includeTimestamp && hasSignature) {
        const lastPage = doc.file_path ? Math.max(...fields.map((f) => f.page_number)) : 1;
        const maxY = serializedFields.reduce((m, f) => Math.max(m, f.y + 30), 580);
        serializedFields.push({
          id: "ts-" + Date.now(),
          document_id: signer.document_id,
          signer_id: signer.id,
          field_type: "text",
          page_number: lastPage,
          x: 80,
          y: maxY,
          width: 300,
          height: 20,
          value: `Signed at ${format(new Date(), "PPpp")} via eFinSign`,
          label: null,
        });
      }

      const updates = serializedFields.map((f) => {
        const { id, ...rest } = f;
        return supabase.from("document_fields").upsert({ id, ...rest }, { onConflict: "id" });
      });

      const signatureField = serializedFields.find((f) => f.field_type === "signature");
      if (signatureField?.value) {
        updates.push(
          supabase.from("signatures").insert({
            signer_id: signer.id,
            image_data: signatureField.value,
          }),
        );
      }

      updates.push(
        supabase
          .from("document_signers")
          .update({ status: "signed", signed_at: new Date().toISOString() })
          .eq("id", signer.id),
      );

      updates.push(
        supabase.from("audit_logs").insert({
          document_id: signer.document_id,
          organization_id: doc.organization_id,
          event_type: "signer_signed",
          actor_email: signer.email,
          details: { signer_name: signer.name },
        }),
      );

      await Promise.all(updates);

      try {
        await generateAndUploadSignedPdf(signer.document_id, serializedFields);
        postMessage("EFINSIGN_SIGNER_COMPLETED", {
          signer: { name: signer.name, email: signer.email, status: "signed" },
        });
      } catch (genErr) {
        console.error("Failed to generate signed PDF:", genErr);
      }

      setSigned(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit";
      toast.error(message);
      postMessage("EFINSIGN_ERROR", { message });
    }
    setSubmitting(false);
  }, [token, signer, doc, fields, includeTimestamp, supabase, postMessage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: primaryColor, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!token || (!signer && !loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-6 text-center">
        <XCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Invalid or expired link</h2>
        <p className="text-sm text-muted-foreground">This signing link is invalid or has expired. Please contact the sender.</p>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-6 text-center">
        <CelebrationConfetti />
        <CheckCircle2 className="h-16 w-16" style={{ color: primaryColor }} />
        <h2 className="text-xl font-bold">Document Signed</h2>
        <p className="text-sm text-muted-foreground">Thank you, {signer?.name}.</p>
      </div>
    );
  }

  if (!reviewed && doc) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-xl mx-auto gap-6">
          <h2 className="text-xl font-bold">Review Document</h2>
          <p className="text-sm text-muted-foreground text-center">
            Please review the document before signing.
          </p>

          {pdfLoading && (
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: primaryColor, borderTopColor: "transparent" }} />
          )}

          {pdfUrl && !pdfLoading && (
            <div className="w-full max-h-[400px] border rounded overflow-hidden">
              <PdfViewer url={pdfUrl} height={400} onFieldValues={() => {}} fields={[]} />
            </div>
          )}

          {pdfError && (
            <p className="text-sm text-destructive">{pdfError}</p>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={consented} onCheckedChange={setConsented} />
            <Label className="text-sm">I agree to sign this document electronically</Label>
          </div>

          <Button
            className="w-full"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            disabled={!consented}
            onClick={() => {
              setReviewed(true);
              postMessage("EFINSIGN_SIGNER_VIEWED", {
                signer: { name: signer?.name, email: signer?.email },
              });
            }}
          >
            Begin Signing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{signer?.name}</span>
          <span className="text-xs text-muted-foreground">
            {filledCount}/{fields.length} fields filled
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || (fields.filter((f) => f.field_type === "signature").length > 0 &&
              !fields.some((f) => f.field_type === "signature" && f.localValue))}
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>

      <div className="bg-secondary/30 px-4 py-1.5">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%`, backgroundColor: primaryColor }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 min-h-[500px]">
          {pdfUrl ? (
            <PdfViewer
              url={pdfUrl}
              height={600}
              onFieldValues={() => {}}
              fields={fields
                .filter((f) => f.localValue)
                .map((f) => ({
                  id: f.id,
                  field_type: f.field_type,
                  page_number: f.page_number,
                  x: Number(f.x),
                  y: Number(f.y),
                  width: Number(f.width),
                  height: Number(f.height),
                  value: f.localValue || "",
                  label: f.label || null,
                }))}
            />
          ) : pdfLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: primaryColor, borderTopColor: "transparent" }} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {pdfError || "Loading document..."}
            </div>
          )}
        </div>

        <div className="lg:w-72 border-t lg:border-t-0 lg:border-l p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Switch checked={includeTimestamp} onCheckedChange={setIncludeTimestamp} />
            <Label className="text-xs">Include timestamp</Label>
          </div>

          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {sortedFields.map((field) => (
              <button
                key={field.id}
                onClick={() => !field.localValue && openField(field)}
                className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm transition-colors ${
                  field.localValue
                    ? "bg-muted/30 text-muted-foreground cursor-default"
                    : nextUnfilledField?.id === field.id
                      ? "ring-2 ring-offset-1 bg-secondary/60 hover:bg-secondary/80"
                      : "bg-secondary/30 hover:bg-secondary/50"
                }`}
                style={nextUnfilledField?.id === field.id ? { ringColor: primaryColor } : {}}
              >
                {field.localValue ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                ) : (
                  getFieldIcon(field.field_type)
                )}
                <span className="truncate text-xs">
                  {field.localValue
                    ? "Filled"
                    : getFieldLabel(field.field_type)
                  }
                </span>
              </button>
            ))}

            <button
              onClick={() => {
                if (signer) {
                  setDeclined(true);
                  postMessage("EFINSIGN_SIGNER_DECLINED", {
                    signer: { name: signer.name, email: signer.email },
                    reason: "Declined by signer",
                  });
                }
              }}
              className="w-full flex items-center gap-2 p-2 rounded text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="text-xs">Decline to sign</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signature Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{activeField?.field_type === "initials" ? "Draw Initials" : "Draw Signature"}</DialogTitle>
          </DialogHeader>
          <SignatureCapture
            onSave={handleSignatureSave}
            saveLabel="Apply"
            compact
            containerHeight={200}
          />
        </DialogContent>
      </Dialog>

      {/* Text Dialog */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getFieldLabel(activeField?.field_type)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              autoFocus
              placeholder={getFieldPlaceholder(activeField?.field_type)}
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleTextSave(); }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setTextDialogOpen(false); setActiveField(null); }}>
                Cancel
              </Button>
              <Button
                onClick={handleTextSave}
                disabled={!textInputValue.trim()}
                style={{ backgroundColor: primaryColor }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EmbedSign() {
  return (
    <EmbedProvider>
      <EmbedSignInner />
    </EmbedProvider>
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
