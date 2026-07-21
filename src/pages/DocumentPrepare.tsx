import { useState, useEffect, useCallback } from "react";
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
import { Plus, Trash2, Send, UserPlus, Type, PenTool, Calendar, FileSignature, X, CheckCircle, ArrowLeft, Save, User, Briefcase } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Signer = Tables<"document_signers">;
type DocField = Tables<"document_fields">;

const SIGNER_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];
const FIELD_TYPES = [
  { type: "signature", label: "Signature", icon: PenTool, w: 200, h: 60 },
  { type: "initials", label: "Initials", icon: FileSignature, w: 80, h: 30 },
  { type: "full_name", label: "Full Name", icon: User, w: 200, h: 30 },
  { type: "title", label: "Title", icon: Briefcase, w: 150, h: 30 },
  { type: "date", label: "Date", icon: Calendar, w: 150, h: 30 },
  { type: "text", label: "Text", icon: Type, w: 150, h: 30 },
];

const SELF_SIGN_FIELD_DIMS: Record<string, { w: number; h: number }> = {
  signature: { w: 200, h: 60 },
  initials: { w: 80, h: 30 },
  full_name: { w: 200, h: 30 },
  title: { w: 150, h: 30 },
  date: { w: 150, h: 30 },
  text: { w: 150, h: 30 },
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
    };
    load();
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [id, user]);

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
    await supabase.from("saved_signatures" as any).delete().eq("id", sigId);
    setDbSignatures((prev) => prev.filter((s) => s.id !== sigId));
    setDbInitials((prev) => prev.filter((s) => s.id !== sigId));
  };

  const handleTextFieldRequest = () => {
    setTextValue("");
    setTextDialogOpen(true);
  };

  const handleTextDialogConfirm = async () => {
    if (!textValue.trim()) { toast.error("Enter some text"); return; }
    setTextDialogOpen(false);
    // Place text field via click - set pending and store value
    setPendingFieldType("text");
  };


  const addSigner = async () => {
    if (!newSignerName || !newSignerEmail || !id) return;
    const { data, error } = await supabase
      .from("document_signers")
      .insert({
        document_id: id,
        name: newSignerName,
        email: newSignerEmail,
        signing_order: signers.length + 1,
        color: SIGNER_COLORS[signers.length % SIGNER_COLORS.length],
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setSigners([...signers, data]);

    // Auto-save to clients if not already present
    if (currentOrg && !clients.find((c) => c.email?.toLowerCase() === newSignerEmail.toLowerCase())) {
      const { data: newClient } = await supabase
        .from("clients")
        .insert({ organization_id: currentOrg.id, name: newSignerName, email: newSignerEmail })
        .select("id, name, email")
        .single();
      if (newClient) {
        setClients((prev) => [...prev, newClient]);
        toast.success(`Added ${newSignerName} to contacts`);
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
        const dims = SELF_SIGN_FIELD_DIMS[pendingFieldType] || { w: 150, h: 30 };
        const { data, error } = await supabase
          .from("document_fields")
          .insert({
            document_id: id,
            signer_id: selfSigner.id,
            field_type: pendingFieldType,
            page_number: pageNumber,
            x,
            y,
            width: dims.w,
            height: dims.h,
            // Auto-fill value for certain types
            ...(pendingFieldType === "signature" && savedSignature ? { value: savedSignature } : {}),
            ...(pendingFieldType === "initials" && savedInitials ? { value: savedInitials } : {}),
            ...(pendingFieldType === "date" ? { value: new Date().toLocaleDateString() } : {}),
            ...(pendingFieldType === "checkmark" ? { value: "✓" } : {}),
            ...(pendingFieldType === "text" && textValue ? { value: textValue } : {}),
          })
          .select()
          .single();
        if (error) { toast.error(error.message); return; }
        setSelfFields((prev) => [...prev, data]);
      } else {
        // Prepare mode: use selectedSigner
        if (!selectedSigner) return;
        const fieldDef = FIELD_TYPES.find((f) => f.type === pendingFieldType);
        if (!fieldDef) return;
        const { data, error } = await supabase
          .from("document_fields")
          .insert({
            document_id: id,
            signer_id: selectedSigner,
            field_type: pendingFieldType,
            page_number: pageNumber,
            x,
            y,
            width: fieldDef.w,
            height: fieldDef.h,
          })
          .select()
          .single();
        if (error) { toast.error(error.message); return; }
        setFields((prev) => [...prev, data]);
      }
      setPendingFieldType(null);
    },
    [pendingFieldType, selectedSigner, selfSignMode, selfSigner, savedSignature, savedInitials, textValue, id]
  );

  const handlePageDrop = useCallback(
    async (pageNumber: number, x: number, y: number, fieldType: string) => {
      if (!id) return;

      if (selfSignMode) {
        if (!selfSigner) return;
        if (fieldType === "signature" && !savedSignature) { toast.error("Create a signature first"); return; }
        if (fieldType === "initials" && !savedInitials) { toast.error("Create initials first"); return; }
        const dims = SELF_SIGN_FIELD_DIMS[fieldType] || { w: 150, h: 30 };
        const { data, error } = await supabase
          .from("document_fields")
          .insert({
            document_id: id,
            signer_id: selfSigner.id,
            field_type: fieldType,
            page_number: pageNumber,
            x, y,
            width: dims.w,
            height: dims.h,
            ...(fieldType === "signature" && savedSignature ? { value: savedSignature } : {}),
            ...(fieldType === "initials" && savedInitials ? { value: savedInitials } : {}),
            ...(fieldType === "date" ? { value: new Date().toLocaleDateString() } : {}),
            ...(fieldType === "checkmark" ? { value: "✓" } : {}),
            ...(fieldType === "text" && textValue ? { value: textValue } : {}),
          })
          .select()
          .single();
        if (error) { toast.error(error.message); return; }
        setSelfFields((prev) => [...prev, data]);
      } else {
        if (!selectedSigner) { toast.error("Select a signer first"); return; }
        const fieldDef = FIELD_TYPES.find((f) => f.type === fieldType);
        const dims = fieldDef ? { w: fieldDef.w, h: fieldDef.h } : { w: 150, h: 30 };
        const { data, error } = await supabase
          .from("document_fields")
          .insert({
            document_id: id,
            signer_id: selectedSigner,
            field_type: fieldType,
            page_number: pageNumber,
            x, y,
            width: dims.w,
            height: dims.h,
          })
          .select()
          .single();
        if (error) { toast.error(error.message); return; }
        setFields((prev) => [...prev, data]);
      }
    },
    [selectedSigner, selfSignMode, selfSigner, savedSignature, savedInitials, textValue, id]
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
    await supabase.from("documents").update({ status: "pending" }).eq("id", id);
    const { data, error } = await supabase.functions.invoke("send-signing-notifications", {
      body: { document_id: id },
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
          name: profile?.full_name || user.email || "Owner",
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
            label={f.field_type}
            value={f.value}
            fieldType={f.field_type}
            onMove={moveField}
            onResize={resizeField}
            onDelete={removeField}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="space-y-4">
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
                  {signers.map((signer) => (
                    <div
                      key={signer.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                        selectedSigner === signer.id ? "bg-secondary" : "hover:bg-secondary/50"
                      }`}
                      onClick={() => setSelectedSigner(signer.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: signer.color }} />
                        <div>
                          <p className="text-sm font-medium">{signer.name}</p>
                          <p className="text-xs text-muted-foreground">{signer.email}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeSigner(signer.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
                    <Button onClick={addSigner} variant="outline" className="w-full gap-2" size="sm">
                      <Plus className="h-3 w-3" /> Add Signer
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
                  <div className="grid grid-cols-2 gap-2">
                    {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                      <Button
                        key={type}
                        variant={pendingFieldType === type ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                        onClick={() => handleFieldTypeClick(type)}
                      >
                        <Icon className="h-3 w-3" /> {label}
                      </Button>
                    ))}
                  </div>
                  {fields.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {fields.map((f) => {
                        const signer = signers.find((s) => s.id === f.signer_id);
                        return (
                          <div key={f.id} className="flex items-center justify-between text-sm py-1">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: signer?.color }} />
                              <span className="capitalize">{f.field_type}</span>
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
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right: PDF Preview */}
        <div className="lg:col-span-2">
          <Card className="bg-card/60 border-border/50 h-[600px] overflow-hidden">
            {pdfUrl ? (
              <PdfViewer
                url={pdfUrl}
                className="w-full h-full"
                placementMode={!!pendingFieldType}
                onPageClick={handlePageClick}
                onPageDrop={handlePageDrop}
                renderPageOverlay={renderPageOverlay}
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
            <DialogTitle className="font-display">Enter Text</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Type your text here..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextDialogConfirm()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTextDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTextDialogConfirm}>Place on Document</Button>
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
