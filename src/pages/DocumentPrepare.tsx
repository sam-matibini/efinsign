import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PdfViewer from "@/components/PdfViewer";
import DraggableField from "@/components/DraggableField";
import FillSignSidebar from "@/components/FillSignSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Send, UserPlus, Type, PenTool, Calendar, FileSignature, X, CheckCircle, ArrowLeft, Save, User, Briefcase, ChevronUp, ChevronDown, ArrowRight } from "lucide-react";
import FieldFormatBar from "@/components/FieldFormatBar";
import { decodeFieldValue, encodeFieldValue, EMPTY_FIELD_STYLE, type FieldStyle } from "@/lib/fieldStyle";
import { nextUnfilledField, nextUnplacedType } from "@/lib/nextAction";
import { readOrgSeal } from "@/lib/orgSeal";
import { insertDocumentField, isSealField } from "@/lib/documentFields";
import { isTextLikeField } from "@/lib/fieldFont";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import { accountFieldValue, buildAccountDetails, isAccountHolder, readAccountTitle, type AccountDetails } from "@/lib/accountProfile";
import { stepFieldHeight } from "@/lib/fieldFont";
import { CHECK_STYLES, type CheckStyle } from "@/lib/checkStyles";
import { COMPANY_SEALS, companySealDataUrl } from "@/lib/companySeals";

type Signer = Tables<"document_signers">;
type DocField = Tables<"document_fields">;

const SIGNER_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];
const FIELD_TYPES = [
  { type: "signature", label: "Signature", icon: PenTool, w: 200, h: 60 },
  { type: "initials", label: "Initials", icon: FileSignature, w: 80, h: 30 },
  { type: "full_name", label: "Full Name", icon: User, w: 220, h: 48 },
  { type: "title", label: "Title", icon: Briefcase, w: 180, h: 48 },
  { type: "date", label: "Date", icon: Calendar, w: 150, h: 30 },
  { type: "text", label: "Text", icon: Type, w: 220, h: 64 },
];

const SELF_SIGN_FIELD_DIMS: Record<string, { w: number; h: number }> = {
  signature: { w: 200, h: 60 },
  initials: { w: 80, h: 30 },
  full_name: { w: 220, h: 48 },
  title: { w: 180, h: 48 },
  date: { w: 150, h: 30 },
  text: { w: 220, h: 64 },
  checkmark: { w: 30, h: 30 },
};

export default function DocumentPrepare() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Tables<"documents"> | null>(null);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [fields, setFields] = useState<DocField[]>([]);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [selectedSigner, setSelectedSigner] = useState<string | null>(null);
  const [pendingFieldType, setPendingFieldType] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Client lookup state
  const [clients, setClients] = useState<Array<{ id: string; name: string; email: string | null }>>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // Self-sign mode state
  const [selfSignMode, setSelfSignMode] = useState(false);
  const [selfSigner, setSelfSigner] = useState<Signer | null>(null);
  const [selfFields, setSelfFields] = useState<DocField[]>([]);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [savedInitials, setSavedInitials] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [hasSelfSigned, setHasSelfSigned] = useState(false);

  // Persisted signatures from DB
  const [dbSignatures, setDbSignatures] = useState<Array<{ id: string; image_data: string; type: string; label: string | null }>>([]);
  const [dbInitials, setDbInitials] = useState<Array<{ id: string; image_data: string; type: string; label: string | null }>>([]);

  // Text input dialog state
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [textStyle, setTextStyle] = useState<FieldStyle>(EMPTY_FIELD_STYLE);
  const [textEditId, setTextEditId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [textFieldKind, setTextFieldKind] = useState<"text" | "full_name" | "title">("text");
  const [accountDetails, setAccountDetails] = useState<AccountDetails>(() => buildAccountDetails({}));
  const [signingMessage, setSigningMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("none");
  const [checkStyle, setCheckStyle] = useState<CheckStyle>("check");
  const [pendingSeal, setPendingSeal] = useState<string | null>(null);
  const sealAppendedRef = useRef(false);

  // Save as template dialog
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Load clients for autocomplete
  useEffect(() => {
    if (!currentOrg) return;
    supabase
      .from("clients")
      .select("id, name, email")
      .eq("organization_id", currentOrg.id)
      .order("name")
      .then(({ data }) => { if (data) setClients(data); });
  }, [currentOrg]);

  // Escape key cancels placement mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPendingFieldType(null); setShowClientSuggestions(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const [docRes, signersRes, fieldsRes] = await Promise.all([
        supabase.from("documents").select("*").eq("id", id).single(),
        supabase.from("document_signers").select("*").eq("document_id", id).order("signing_order"),
        supabase.from("document_fields").select("*").eq("document_id", id),
      ]);
      if (docRes.data) {
        setDoc(docRes.data);
        if (docRes.data.file_path) {
          const { data: urlData } = await supabase.storage
            .from("documents")
            .createSignedUrl(docRes.data.file_path, 3600);
          if (urlData) {
            const resp = await fetch(urlData.signedUrl);
            const blob = await resp.blob();
            setPdfUrl(URL.createObjectURL(blob));
          }
        }
      }
      setSigners(signersRes.data || []);
      setFields(fieldsRes.data || []);
      setLoading(false);
      const stamp = readOrgSeal(currentOrg?.id, currentOrg?.seal_stamp);
      const loadedFields = fieldsRes.data || [];
      const signerId = signersRes.data?.[0]?.id;
      if (stamp && signerId && id && !sealAppendedRef.current && !loadedFields.some((f) => isSealField(f))) {
        sealAppendedRef.current = true;
        const { data: sealField, error: sealError } = await insertDocumentField({
          document_id: id,
          signer_id: signerId,
          field_type: "seal",
          page_number: 1,
          x: 48,
          y: 48,
          width: 140,
          height: 140,
          value: stamp,
        });
        if (sealError) {
          sealAppendedRef.current = false;
          toast.error(sealError.message);
        } else if (sealField) {
          setFields((prev) => [...prev, sealField]);
        }
      }
    };
    load();
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [id, user, currentOrg?.id, currentOrg?.seal_stamp]);

  useEffect(() => {
    if (!user) return;
    const title = readAccountTitle(user.id, (user.user_metadata as { job_title?: string } | undefined)?.job_title);
    supabase.from("profiles").select("full_name").eq("user_id", user.id).single()
      .then(({ data }) => {
        setAccountDetails(buildAccountDetails({
          fullName: data?.full_name,
          title,
          email: user.email,
        }));
      });
  }, [user]);

  // Load saved signatures from DB
  useEffect(() => {
    if (!user || !currentOrg) return;
    const loadSaved = async () => {
      const { data } = await supabase
        .from("saved_signatures" as any)
        .select("*")
        .eq("organization_id", currentOrg.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        const sigs = (data as any[]).filter((s: any) => s.type === "signature");
        const inits = (data as any[]).filter((s: any) => s.type === "initials");
        setDbSignatures(sigs);
        setDbInitials(inits);
        if (sigs.length > 0 && !savedSignature) {
          const defaultSig = sigs.find((s: any) => s.is_default);
          setSavedSignature((defaultSig || sigs[0]).image_data);
        }
        if (inits.length > 0 && !savedInitials) {
          const defaultInit = inits.find((s: any) => s.is_default);
          setSavedInitials((defaultInit || inits[0]).image_data);
        }
      }
    };
    loadSaved();
  }, [user, currentOrg]);

  const persistSignature = async (imageData: string) => {
    if (!user || !currentOrg) return;
    const { data } = await supabase
      .from("saved_signatures" as any)
      .insert({ user_id: user.id, organization_id: currentOrg.id, type: "signature", image_data: imageData } as any)
      .select()
      .single();
    if (data) setDbSignatures((prev) => [data as any, ...prev]);
  };

  const persistInitials = async (imageData: string) => {
    if (!user || !currentOrg) return;
    const { data } = await supabase
      .from("saved_signatures" as any)
      .insert({ user_id: user.id, organization_id: currentOrg.id, type: "initials", image_data: imageData } as any)
      .select()
      .single();
    if (data) setDbInitials((prev) => [data as any, ...prev]);
  };

  const deleteSavedSig = async (sigId: string) => {
    if (!user) return;
    await supabase.from("saved_signatures" as any).delete().eq("id", sigId).eq("user_id", user.id);
    setDbSignatures((prev) => prev.filter((s) => s.id !== sigId));
    setDbInitials((prev) => prev.filter((s) => s.id !== sigId));
  };

  const openTextDialog = (kind: "text" | "full_name" | "title") => {
    setTextFieldKind(kind);
    const preset = kind === "full_name"
      ? accountDetails.fullName
      : kind === "title"
        ? accountDetails.title
        : "";
    setTextValue(preset);
    setTextStyle(EMPTY_FIELD_STYLE);
    setTextEditId(null);
    setTextDialogOpen(true);
  };

  const handleTextFieldRequest = () => openTextDialog("text");

  const handleTextDialogConfirm = async () => {
    if (!textValue.trim()) { toast.error("Enter some text"); return; }
    const encoded = encodeFieldValue(textValue.trim(), textStyle);
    if (textEditId) {
      const updater = (prev: DocField[]) => prev.map((f) => f.id === textEditId ? { ...f, value: encoded } : f);
      setFields(updater);
      setSelfFields(updater);
      await supabase.from("document_fields").update({ value: encoded }).eq("id", textEditId);
      setTextDialogOpen(false);
      setTextEditId(null);
      return;
    }
    setTextDialogOpen(false);
    setPendingFieldType(textFieldKind);
  };

  const fieldValueFor = useCallback((fieldType: string, signerEmail?: string | null, self = false) => {
    const forAccountHolder = self || isAccountHolder(signerEmail, accountDetails.email || user?.email);
    const value = accountFieldValue(fieldType, accountDetails, {
      signature: savedSignature,
      initials: savedInitials,
      typedText: textValue,
      forAccountHolder,
      useTypedText: pendingFieldType === fieldType && !!textValue.trim(),
    });
    if (!value) return {};
    if (isTextLikeField(fieldType)) return { value: encodeFieldValue(value, textStyle) };
    return { value };
  }, [accountDetails, savedSignature, savedInitials, textValue, pendingFieldType, user, textStyle]);

  const placedExtras = useCallback((fieldType: string, self: boolean, signerEmail?: string | null, sealLabel?: string | null) => {
    if (fieldType === "checkmark") return { value: self ? checkStyle : `style:${checkStyle}` };
    if (fieldType === "seal") return { value: sealLabel || pendingSeal || "seal:efintax" };
    return fieldValueFor(fieldType, signerEmail, self);
  }, [checkStyle, pendingSeal, fieldValueFor]);

  const dimsFor = (fieldType: string) => {
    if (fieldType === "seal") return { w: 140, h: 140 };
    if (fieldType === "checkmark") return { w: 36, h: 36 };
    const known = FIELD_TYPES.find((f) => f.type === fieldType);
    return known ? { w: known.w, h: known.h } : (SELF_SIGN_FIELD_DIMS[fieldType] || { w: 150, h: 30 });
  };


  const addSigner = async (nameArg?: string, emailArg?: string) => {
    const name = (nameArg ?? newSignerName).trim();
    const email = (emailArg ?? newSignerEmail).trim();
    if (!name || !email || !id) return;
    if (signers.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      toast.error("That signer is already on this document");
      const existing = signers.find((s) => s.email.toLowerCase() === email.toLowerCase());
      if (existing) setSelectedSigner(existing.id);
      return;
    }
    const { data, error } = await supabase
      .from("document_signers")
      .insert({
        document_id: id,
        name,
        email,
        signing_order: signers.length + 1,
        color: SIGNER_COLORS[signers.length % SIGNER_COLORS.length],
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setSigners([...signers, data]);

    // Auto-save to clients if not already present
    if (currentOrg && !clients.find((c) => c.email?.toLowerCase() === email.toLowerCase())) {
      const { data: newClient } = await supabase
        .from("clients")
        .insert({ organization_id: currentOrg.id, name, email })
        .select("id, name, email")
        .single();
      if (newClient) {
        setClients((prev) => [...prev, newClient]);
        toast.success(`Added ${name} to contacts`);
      }
    }

    setNewSignerName("");
    setNewSignerEmail("");
    setShowClientSuggestions(false);
    toast.success(`Added ${data.name}`);
  };

  const removeSigner = async (signerId: string) => {
    await supabase.from("document_signers").delete().eq("id", signerId);
    setSigners(signers.filter((s) => s.id !== signerId));
    setFields(fields.filter((f) => f.signer_id !== signerId));
  };

  const moveSigner = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= signers.length) return;
    const next = [...signers];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    const reordered = next.map((s, i) => ({ ...s, signing_order: i + 1 }));
    setSigners(reordered);
    await Promise.all(reordered.map((s) =>
      supabase.from("document_signers").update({ signing_order: s.signing_order }).eq("id", s.id)
    ));
  };

  const openFieldEditor = (field: DocField) => {
    setSelectedFieldId(field.id);
    if (isSealField(field)) return;
    if (isTextLikeField(field.field_type)) {
      const decoded = decodeFieldValue(field.value);
      setTextFieldKind(field.field_type === "full_name" || field.field_type === "title" ? field.field_type : "text");
      setTextValue(decoded.text);
      setTextStyle({ ...EMPTY_FIELD_STYLE, ...decoded.style });
      setTextEditId(field.id);
      setTextDialogOpen(true);
      return;
    }
    if (field.field_type === "signature") {
      setPendingFieldType(null);
      toast.info("Replace this signature by choosing one in the sidebar, or drag the box.");
    }
  };

  const handleNextAction = () => {
    const all = selfSignMode ? selfFields : fields;
    const unfilled = nextUnfilledField(all);
    if (unfilled && isTextLikeField(unfilled.field_type) && !isSealField(unfilled)) {
      openFieldEditor(unfilled);
      toast.message(`Next: ${unfilled.field_type.replaceAll("_", " ")}`);
      return;
    }
    const nextType = nextUnplacedType(all);
    if (nextType === "text") openTextDialog("text");
    else handleFieldTypeClick(nextType);
    toast.message(`Next: place ${nextType.replaceAll("_", " ")}`);
  };

  const handleFieldTypeClick = (fieldType: string) => {
    if (!selfSignMode && !selectedSigner) {
      toast.error("Select a signer first");
      return;
    }
    setPendingFieldType(pendingFieldType === fieldType ? null : fieldType);
  };

  const handlePageClick = useCallback(
    async (pageNumber: number, x: number, y: number) => {
      if (!pendingFieldType || !id) return;

      if (selfSignMode) {
        // Self-sign mode: use selfSigner
        if (!selfSigner) return;
        const dims = dimsFor(pendingFieldType);
        const { data, error } = await insertDocumentField({
          document_id: id,
          signer_id: selfSigner.id,
          field_type: pendingFieldType,
          page_number: pageNumber,
          x,
          y,
          width: dims.w,
          height: dims.h,
          ...placedExtras(pendingFieldType, true, selfSigner.email),
        });
        if (error) { toast.error(error.message); return; }
        setSelfFields((prev) => [...prev, data]);
      } else {
        // Prepare mode: use selectedSigner
        if (!selectedSigner) return;
        const dims = dimsFor(pendingFieldType);
        const { data, error } = await insertDocumentField({
          document_id: id,
          signer_id: selectedSigner,
          field_type: pendingFieldType,
          page_number: pageNumber,
          x,
          y,
          width: dims.w,
          height: dims.h,
          ...placedExtras(pendingFieldType, false, signers.find((s) => s.id === selectedSigner)?.email),
        });
        if (error) { toast.error(error.message); return; }
        setFields((prev) => [...prev, data]);
      }
      setPendingFieldType(null);
    },
    [pendingFieldType, selectedSigner, selfSignMode, selfSigner, id, signers, placedExtras]
  );

  const handlePageDrop = useCallback(
    async (pageNumber: number, x: number, y: number, fieldType: string, sealLabel?: string) => {
      if (!id) return;

      if (selfSignMode) {
        if (!selfSigner) return;
        if (fieldType === "signature" && !savedSignature) { toast.error("Create a signature first"); return; }
        if (fieldType === "initials" && !savedInitials) { toast.error("Create initials first"); return; }
        const dims = dimsFor(fieldType);
        const { data, error } = await insertDocumentField({
          document_id: id,
          signer_id: selfSigner.id,
          field_type: fieldType,
          page_number: pageNumber,
          x, y,
          width: dims.w,
          height: dims.h,
          ...placedExtras(fieldType, true, selfSigner.email, sealLabel),
        });
        if (error) { toast.error(error.message); return; }
        setSelfFields((prev) => [...prev, data]);
      } else {
        if (!selectedSigner) { toast.error("Select a signer first"); return; }
        const dims = dimsFor(fieldType);
        const { data, error } = await insertDocumentField({
          document_id: id,
          signer_id: selectedSigner,
          field_type: fieldType,
          page_number: pageNumber,
          x, y,
          width: dims.w,
          height: dims.h,
          ...placedExtras(fieldType, false, signers.find((s) => s.id === selectedSigner)?.email, sealLabel),
        });
        if (error) { toast.error(error.message); return; }
        setFields((prev) => [...prev, data]);
      }
    },
    [selectedSigner, selfSignMode, selfSigner, id, signers, placedExtras]
  );

  const removeField = async (fieldId: string) => {
    await supabase.from("document_fields").delete().eq("id", fieldId);
    setFields(fields.filter((f) => f.id !== fieldId));
    setSelfFields(selfFields.filter((f) => f.id !== fieldId));
  };

  const moveField = async (fieldId: string, newX: number, newY: number) => {
    const updater = (prev: DocField[]) => prev.map((f) => f.id === fieldId ? { ...f, x: newX, y: newY } : f);
    setFields(updater);
    setSelfFields(updater);
    await supabase.from("document_fields").update({ x: newX, y: newY }).eq("id", fieldId);
  };

  const resizeField = async (fieldId: string, newW: number, newH: number, newX?: number, newY?: number) => {
    const updater = (prev: DocField[]) => prev.map((f) => f.id === fieldId ? { ...f, width: newW, height: newH, ...(newX != null ? { x: newX } : {}), ...(newY != null ? { y: newY } : {}) } : f);
    setFields(updater);
    setSelfFields(updater);
    const update: Record<string, number> = { width: newW, height: newH };
    if (newX != null) update.x = newX;
    if (newY != null) update.y = newY;
    await supabase.from("document_fields").update(update).eq("id", fieldId);
  };

  const sendForSigning = async () => {
    // Filter out the self-signer from the "other signers" check
    const otherSigners = signers.filter((s) => s.id !== selfSigner?.id);
    if (otherSigners.length === 0) { toast.error("Add at least one signer"); return; }
    // Check that other signers have fields assigned
    const otherSignerFields = fields.filter((f) => otherSigners.some((s) => s.id === f.signer_id));
    if (otherSignerFields.length === 0) { toast.error("Add at least one field for your signers"); return; }
    if (expiresInDays !== "none") {
      const days = Number(expiresInDays);
      if (days > 0) {
        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        await supabase.from("document_signers").update({ expires_at: expires.toISOString() }).eq("document_id", id);
      }
    }
    await supabase.from("documents").update({ status: "pending" }).eq("id", id);
    const { data, error } = await supabase.functions.invoke("send-signing-notifications", {
      body: {
        document_id: id,
        ...(signingMessage.trim() ? { message: signingMessage.trim() } : {}),
      },
    });
    if (error) {
      console.error("Email notification error:", error);
      toast.success("Document sent for signing! (Email notifications could not be sent)");
    } else {
      const failed = data?.results?.filter((r: any) => !r.success) || [];
      if (failed.length > 0) {
        toast.success(`Document sent! ${failed.length} email(s) could not be delivered.`);
      } else {
        toast.success("Document sent for signing! All signers have been notified.");
      }
    }
    navigate("/");
  };

  // --- Self-sign mode functions ---
  const enterSelfSignMode = async () => {
    if (!id || !user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      const { data: signer, error } = await supabase
        .from("document_signers")
        .insert({
          document_id: id,
          name: accountDetails.fullName || profile?.full_name || user.email || "Owner",
          email: user.email!,
          signing_order: 1,
          color: SIGNER_COLORS[0],
        })
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      setSelfSigner(signer);
      setSelfSignMode(true);
      setPendingFieldType(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to start self-signing");
    }
  };

  const cancelSelfSign = async () => {
    // Clean up: delete the self-signer and any fields placed
    if (selfSigner) {
      await supabase.from("document_fields").delete().eq("signer_id", selfSigner.id);
      await supabase.from("document_signers").delete().eq("id", selfSigner.id);
    }
    setSelfSigner(null);
    setSelfFields([]);
    setSelfSignMode(false);
    setSavedSignature(null);
    setSavedInitials(null);
    setPendingFieldType(null);
  };

  const handleSignAndSave = async () => {
    if (!selfSigner || !id) return;
    if (selfFields.length === 0) {
      toast.error("Place at least one field on the document");
      return;
    }
    setSigning(true);
    try {
      if (savedSignature) {
        await supabase.from("signatures").insert({
          signer_id: selfSigner.id,
          image_data: savedSignature,
        });
      }
      await supabase.from("document_signers").update({
        status: "signed",
        signed_at: new Date().toISOString(),
      }).eq("id", selfSigner.id);
      await supabase.from("audit_logs").insert({
        document_id: id,
        event_type: "signed",
        actor_email: selfSigner.email,
      });

      // Merge self-sign fields into main fields and keep selfSigner in signers
      setFields((prev) => [...prev, ...selfFields]);
      setSigners((prev) => {
        if (prev.some((s) => s.id === selfSigner.id)) return prev;
        return [selfSigner, ...prev];
      });

      // Exit self-sign mode but stay on prepare page
      setHasSelfSigned(true);
      setSelfSignMode(false);
      setSelfFields([]);
      setPendingFieldType(null);

      toast.success("Signed! You can now add other signers or complete the document.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSigning(false);
    }
  };

  const completeDocument = async () => {
    if (!id) return;
    await supabase.from("documents").update({ status: "completed" }).eq("id", id);
    toast.success("Document completed!");
    navigate("/");
  };

  const handleSaveAsTemplate = async () => {
    if (!doc || !user || !templateTitle.trim()) return;
    setSavingTemplate(true);
    try {
      const signerData = signers.map((s) => ({
        name: s.name,
        email: s.email,
        color: s.color,
        signing_order: s.signing_order,
      }));
      const fieldData = fields.map((f) => {
        const signerIndex = signers.findIndex((s) => s.id === f.signer_id);
        return {
          field_type: f.field_type,
          page_number: f.page_number,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          signer_index: signerIndex,
        };
      });
      await supabase.from("templates" as any).insert({
        owner_id: user.id,
        title: templateTitle.trim(),
        description: templateDesc.trim() || null,
        file_path: doc.file_path,
        signers: signerData,
        fields: fieldData,
      } as any);
      toast.success("Template saved!");
      setSaveTemplateOpen(false);
      setTemplateTitle("");
      setTemplateDesc("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  // --- Render overlays ---
  const renderPageOverlay = useCallback(
    (pageNumber: number) => {
      const allFields = selfSignMode ? selfFields : fields;
      const allSigners = selfSignMode && selfSigner ? [selfSigner, ...signers] : signers;
      const pageFields = allFields.filter((f) => f.page_number === pageNumber);
      return pageFields.map((f) => {
        const signer = allSigners.find((s) => s.id === f.signer_id);
        return (
          <DraggableField
            key={f.id}
            id={f.id}
            x={f.x}
            y={f.y}
            width={f.width}
            height={f.height}
            color={signer?.color || "#3B82F6"}
            label={isSealField(f) ? "seal" : f.field_type}
            value={f.value}
            fieldType={isSealField(f) ? "seal" : f.field_type}
            selected={selectedFieldId === f.id}
            onSelect={setSelectedFieldId}
            onEdit={(fieldId) => {
              const field = [...fields, ...selfFields].find((item) => item.id === fieldId);
              if (field) openFieldEditor(field);
            }}
            onMove={moveField}
            onResize={resizeField}
            otherRects={pageFields.filter((item) => item.id !== f.id).map((item) => ({ x: item.x, y: item.y, w: item.width, h: item.height }))}
            onDelete={removeField}
            onAdjustFont={(fieldId, direction) => {
              const field = [...fields, ...selfFields].find((item) => item.id === fieldId);
              if (!field) return;
              resizeField(fieldId, field.width, stepFieldHeight(field.height, direction));
            }}
          />
        );
      });
    },
    [fields, selfFields, signers, selfSigner, selfSignMode, moveField]
  );

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!doc) return <div className="text-center py-12 text-muted-foreground">Document not found</div>;

  const pendingLabel = [...FIELD_TYPES, { type: "checkmark", label: "Checkmark" }].find((f) => f.type === pendingFieldType)?.label;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/documents/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold">{doc.title}</h1>
          <p className="text-muted-foreground mt-1">
            {selfSignMode ? "Place fields and sign your document" : "Add signers and place fields"}
            </p>
          </div>
        </div>
        {!selfSignMode && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setTemplateTitle(doc.title); setSaveTemplateOpen(true); }} className="gap-2">
              <Save className="h-4 w-4" />
              Save as Template
            </Button>
            {hasSelfSigned && (
              <Badge variant="secondary" className="gap-1.5 py-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                You've signed
              </Badge>
            )}
            {!hasSelfSigned && (
              <Button variant="outline" onClick={enterSelfSignMode} className="gap-2">
                <PenTool className="h-4 w-4" />
                Fill & Sign Yourself
              </Button>
            )}
            <Button onClick={sendForSigning} className="gap-2">
              <Send className="h-4 w-4" />
              Send for Signing
            </Button>
            {hasSelfSigned && (
              <Button variant="secondary" onClick={completeDocument} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Complete Document
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Placement mode banner */}
      {pendingFieldType && (
        <div className="flex items-center justify-between bg-accent/50 border border-accent rounded-lg px-4 py-2 text-sm">
          <span>
            Click on the document to place a <strong>{pendingLabel}</strong> field
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingFieldType(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left sidebar */}
        <div className="space-y-4 xl:col-span-3">
          {selfSignMode ? (
            <FillSignSidebar
              pendingFieldType={pendingFieldType}
              onFieldTypeClick={handleFieldTypeClick}
              savedSignature={savedSignature}
              savedInitials={savedInitials}
              onSaveSignature={setSavedSignature}
              onSaveInitials={setSavedInitials}
              onDeleteSignature={() => setSavedSignature(null)}
              onDeleteInitials={() => setSavedInitials(null)}
              onSignAndSave={handleSignAndSave}
              onCancel={cancelSelfSign}
              signing={signing}
              allSavedSignatures={dbSignatures}
              allSavedInitials={dbInitials}
              onPersistSignature={persistSignature}
              onPersistInitials={persistInitials}
              onDeleteSavedSig={deleteSavedSig}
              onTextFieldRequest={handleTextFieldRequest}
              onIdentityField={(kind) => openTextDialog(kind)}
              accountFullName={accountDetails.fullName}
              accountTitle={accountDetails.title}
              accountDate={accountDetails.dateLabel}
              checkStyle={checkStyle}
              onCheckStyle={setCheckStyle}
              onPlaceSeal={(label) => { setPendingSeal(label); setPendingFieldType("seal"); }}
              onNext={handleNextAction}
            />
          ) : (
            <>
              <Card className="bg-card/60 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> Signers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {signers.map((signer, index) => (
                    <div
                      key={signer.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                        selectedSigner === signer.id ? "bg-secondary" : "hover:bg-secondary/50"
                      }`}
                      onClick={() => setSelectedSigner(signer.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: signer.color }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{index + 1}. {signer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{signer.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Move up" onClick={(e) => { e.stopPropagation(); moveSigner(index, -1); }}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Move down" onClick={(e) => { e.stopPropagation(); moveSigner(index, 1); }}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeSigner(signer.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border/50 pt-3 space-y-2">
                    <div className="relative">
                      <Input
                        placeholder="Name"
                        value={newSignerName}
                        onChange={(e) => {
                          setNewSignerName(e.target.value);
                          setShowClientSuggestions(e.target.value.length > 0);
                        }}
                        onFocus={() => { if (newSignerName.length > 0) setShowClientSuggestions(true); }}
                        onBlur={() => { setTimeout(() => setShowClientSuggestions(false), 200); }}
                      />
                      {showClientSuggestions && (() => {
                        const query = newSignerName.toLowerCase();
                        const filtered = clients.filter(
                          (c) =>
                            c.name.toLowerCase().includes(query) ||
                            (c.email && c.email.toLowerCase().includes(query))
                        );
                        if (filtered.length === 0) return null;
                        return (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                            {filtered.map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                className="flex flex-col w-full px-3 py-2 text-left hover:bg-accent text-sm"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setNewSignerName(client.name);
                                  setNewSignerEmail(client.email || "");
                                  setShowClientSuggestions(false);
                                }}
                              >
                                <span className="font-medium">{client.name}</span>
                                {client.email && <span className="text-xs text-muted-foreground">{client.email}</span>}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <Input placeholder="Email" type="email" value={newSignerEmail} onChange={(e) => setNewSignerEmail(e.target.value)} />
                    <Button onClick={() => addSigner()} variant="outline" className="w-full gap-2" size="sm">
                      <Plus className="h-3 w-3" /> Add Signer
                    </Button>
                    <Button
                      onClick={() => addSigner(accountDetails.fullName || user?.email || "Me", user?.email || "")}
                      variant="ghost"
                      className="w-full gap-2"
                      size="sm"
                      disabled={!user?.email}
                    >
                      <User className="h-3 w-3" /> Add me
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-display">Fields</CardTitle>
                  {selectedSigner && (
                    <p className="text-xs text-muted-foreground">
                      Adding for: {signers.find((s) => s.id === selectedSigner)?.name}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border/60 bg-secondary/30 p-2 mb-3 space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Your details</p>
                    <p className="text-xs">Name: {accountDetails.fullName || "Add your name in Settings"}</p>
                    <p className="text-xs">Title: {accountDetails.title || "Add your title in Settings"}</p>
                    <p className="text-xs">Date: {accountDetails.dateLabel}</p>
                    <p className="text-[10px] text-muted-foreground">These fill Full Name, Title, Date, and Signature when you are the signer. Text wraps inside the field.</p>
                  </div>
                  <Button variant="default" size="sm" className="w-full mb-3 gap-1.5" onClick={handleNextAction}>
                    <ArrowRight className="h-3.5 w-3.5" /> Next action
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                      <Button
                        key={type}
                        variant={pendingFieldType === type ? "default" : "outline"}
                        size="sm"
                        className="gap-2 cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("fieldType", type);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => {
                          if ((type === "full_name" || type === "title") && isAccountHolder(signers.find((s) => s.id === selectedSigner)?.email, accountDetails.email || user?.email)) {
                            openTextDialog(type);
                            return;
                          }
                          handleFieldTypeClick(type);
                        }}
                      >
                        <Icon className="h-3 w-3" /> {label}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Check marks</p>
                    <div className="flex flex-wrap gap-1">
                      {CHECK_STYLES.map((style) => (
                        <Button
                          key={style.id}
                          variant={checkStyle === style.id && pendingFieldType === "checkmark" ? "default" : "outline"}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          title={style.label}
                          onClick={() => { setCheckStyle(style.id); handleFieldTypeClick("checkmark"); }}
                        >
                          {style.glyph}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Company seals</p>
                    <div className="flex gap-2">
                      {COMPANY_SEALS.map((seal) => (
                        <button
                          key={seal.id}
                          type="button"
                          title={seal.legalName}
                          className="rounded-full border border-border bg-card p-1 hover:ring-2 hover:ring-primary"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("fieldType", "seal");
                            e.dataTransfer.setData("sealLabel", seal.stampLabel);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() => {
                            if (!selectedSigner) { toast.error("Select a signer first"); return; }
                            setPendingSeal(seal.stampLabel);
                            setPendingFieldType("seal");
                          }}
                        >
                          <img src={companySealDataUrl(seal.id)} alt={`${seal.legalName} corporate seal`} className="h-12 w-12" />
                        </button>
                      ))}
                    </div>
                  </div>
                  {fields.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {fields.map((f) => {
                        const signer = signers.find((s) => s.id === f.signer_id);
                        return (
                          <div key={f.id} className="flex items-center justify-between text-sm py-1">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: signer?.color }} />
                              <span className="capitalize">{isSealField(f) ? "seal" : f.field_type.replaceAll("_", " ")}</span>
                              {f.value && !f.value.startsWith("data:") && !isSealField(f) && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[7rem]">{f.value}</span>
                              )}
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                p{f.page_number}
                              </Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeField(f.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
                    <Label htmlFor="sign-message">Message to signers</Label>
                    <Textarea
                      id="sign-message"
                      rows={3}
                      placeholder="Optional note included in the signing email"
                      value={signingMessage}
                      onChange={(e) => setSigningMessage(e.target.value)}
                    />
                    <Label>Link expires</Label>
                    <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No extra expiration</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right: PDF Preview */}
        <div className="xl:col-span-9">
          <Card className="bg-card/60 border-border/50 h-[calc(100vh-10rem)] min-h-[720px] overflow-hidden">
            {pdfUrl ? (
              <PdfViewer
                url={pdfUrl}
                className="w-full h-full"
                placementMode={!!pendingFieldType}
                onPageClick={handlePageClick}
                onPageDrop={handlePageDrop}
                renderPageOverlay={renderPageOverlay}
                nextTagLabel="Next page"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No document preview available
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Text input dialog */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {textFieldKind === "full_name" ? "Full name" : textFieldKind === "title" ? "Title" : "Enter text"}
            </DialogTitle>
          </DialogHeader>
          <FieldFormatBar style={textStyle} onChange={setTextStyle} />
          <Textarea
            placeholder={textFieldKind === "text" ? "Type your text. It wraps inside the field." : "Prefilled from your account. Edit it if you need to."}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextDialogConfirm(); } }}
            rows={3}
            autoFocus
            className="whitespace-pre-wrap break-words"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTextDialogOpen(false); setTextEditId(null); }}>Cancel</Button>
            <Button onClick={handleTextDialogConfirm}>{textEditId ? "Update text" : "Place on Document"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="tpl-title">Template Name</Label>
              <Input
                id="tpl-title"
                placeholder="e.g. NDA Template"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tpl-desc">Description (optional)</Label>
              <Textarea
                id="tpl-desc"
                placeholder="What is this template for?"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAsTemplate} disabled={!templateTitle.trim() || savingTemplate}>
              {savingTemplate ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
