import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, ArrowRight, FolderOpen } from "lucide-react";

interface TemplateData {
  id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  signers: any[];
  fields: any[];
}

export default function DocumentNew() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [template, setTemplate] = useState<TemplateData | null>(null);

  // Load template if query param present
  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId || !user) return;
    const loadTemplate = async () => {
      const { data } = await supabase
        .from("templates" as any)
        .select("*")
        .eq("id", templateId)
        .single();
      if (data) {
        const t = data as any as TemplateData;
        setTemplate(t);
        setTitle(t.title);
        // If template has a PDF, download it as a File
        if (t.file_path) {
          const { data: urlData } = await supabase.storage
            .from("documents")
            .createSignedUrl(t.file_path, 3600);
          if (urlData) {
            try {
              const resp = await fetch(urlData.signedUrl);
              const blob = await resp.blob();
              const fileName = t.file_path.split("/").pop() || "template.pdf";
              setFile(new File([blob], fileName, { type: "application/pdf" }));
            } catch { /* ignore */ }
          }
        }
      }
    };
    loadTemplate();
  }, [searchParams, user]);

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("File size must be under 20MB");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    setUploading(true);
    try {
      const safeName = file.name
        .replace(/[^\w\s.()\[\]-]/g, "-")  // replace special chars (em dashes, etc.) with hyphens
        .replace(/\s+/g, "_")              // replace spaces with underscores
        .replace(/-{2,}/g, "-");           // collapse consecutive hyphens
      const filePath = `${currentOrg?.id || user.id}/${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({ title, file_path: filePath, owner_id: user.id, organization_id: currentOrg?.id } as any)
        .select()
        .single();
      if (docError) throw docError;

      // If created from template, apply signers and fields
      if (template) {
        const signerMap: Record<number, string> = {};
        for (const [i, s] of (template.signers || []).entries()) {
          const { data: signer } = await supabase
            .from("document_signers")
            .insert({
              document_id: doc.id,
              name: s.name,
              email: s.email,
              signing_order: s.signing_order || i + 1,
              color: s.color || "#3B82F6",
            })
            .select()
            .single();
          if (signer) signerMap[i] = signer.id;
        }
        const fieldInserts = (template.fields || [])
          .filter((f: any) => signerMap[f.signer_index] != null)
          .map((f: any) => ({
            document_id: doc.id,
            signer_id: signerMap[f.signer_index],
            field_type: f.field_type,
            page_number: f.page_number || 1,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
          }));
        if (fieldInserts.length > 0) {
          await supabase.from("document_fields").insert(fieldInserts);
        }
      }

      toast.success("Document uploaded!");
      navigate(`/documents/${doc.id}/prepare`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-display font-bold mb-6">New Document</h1>

      {template && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-accent/50 border border-accent text-sm">
          <FolderOpen className="h-4 w-4 text-primary" />
          <span>Using template: <strong>{template.title}</strong></span>
          <Badge variant="secondary" className="ml-auto">
            {template.signers?.length || 0} signers · {template.fields?.length || 0} fields
          </Badge>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Document Title</Label>
          <Input
            id="title"
            placeholder="e.g. Employment Agreement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : file
              ? "border-success/50 bg-success/5"
              : "border-border hover:border-muted-foreground/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-10 w-10 text-success" />
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Drop your PDF here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full gap-2" disabled={!file || !title || uploading}>
          {uploading ? "Uploading..." : "Continue"}
          {!uploading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
