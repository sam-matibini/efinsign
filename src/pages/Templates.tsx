import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FolderOpen, Search, Trash2, FileText, Users, LayoutGrid, Calendar,
  Pencil, Copy, Eye, Tag, X,
} from "lucide-react";
import { format } from "date-fns";
import PdfViewer from "@/components/PdfViewer";

interface Template {
  id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  signers: any[];
  fields: any[];
  tags: string[];
  created_at: string;
}

export default function Templates() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Edit dialog
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  // Preview dialog
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    if (!user || !currentOrg) return;
    setLoading(true);
    const load = async () => {
      const { data } = await supabase
        .from("templates" as any)
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      setTemplates((data as any as Template[]) || []);
      setLoading(false);
    };
    load();
  }, [user, currentOrg]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [templates]);

  const filtered = templates.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesTag = !activeTag || (t.tags || []).includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("templates" as any).delete().eq("id", deleteId);
    setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
    setDeleteId(null);
    toast.success("Template deleted");
  };

  const openEdit = (t: Template) => {
    setEditTemplate(t);
    setEditTitle(t.title);
    setEditDesc(t.description || "");
    setEditTags(t.tags || []);
    setNewTag("");
  };

  const saveEdit = async () => {
    if (!editTemplate) return;
    setSaving(true);
    const { error } = await supabase
      .from("templates" as any)
      .update({ title: editTitle, description: editDesc || null, tags: editTags } as any)
      .eq("id", editTemplate.id);
    if (error) {
      toast.error("Failed to update template");
    } else {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editTemplate.id
            ? { ...t, title: editTitle, description: editDesc || null, tags: editTags }
            : t
        )
      );
      toast.success("Template updated");
      setEditTemplate(null);
    }
    setSaving(false);
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
    }
    setNewTag("");
  };

  const duplicateTemplate = async (t: Template) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("templates" as any)
      .insert({
        title: `${t.title} (Copy)`,
        description: t.description,
        file_path: t.file_path,
        signers: t.signers,
        fields: t.fields,
        tags: t.tags || [],
        owner_id: user.id,
        organization_id: currentOrg?.id,
      } as any)
      .select()
      .single();
    if (error) {
      toast.error("Failed to duplicate template");
    } else {
      setTemplates((prev) => [data as any as Template, ...prev]);
      toast.success("Template duplicated");
    }
  };

  const previewTemplate = async (t: Template) => {
    if (!t.file_path) {
      toast.error("No PDF file associated with this template");
      return;
    }
    const { data } = await supabase.storage.from("documents").createSignedUrl(t.file_path, 300);
    if (data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
      setPreviewTitle(t.title);
    } else {
      toast.error("Failed to load preview");
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold">Templates</h1>
      </div>

      {templates.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge
                variant={activeTag === null ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setActiveTag(null)}
              >
                All
              </Badge>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={activeTag === tag ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="bg-card/40 border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">
              {search || activeTag ? "No templates match your search" : "No templates yet"}
            </p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              {search || activeTag
                ? "Try a different search term or tag"
                : "Save a document configuration as a template from the prepare page"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const signerCount = Array.isArray(template.signers) ? template.signers.length : 0;
            const fieldCount = Array.isArray(template.fields) ? template.fields.length : 0;
            return (
              <Card
                key={template.id}
                className="bg-card/60 border-border/50 hover:border-primary/30 transition-colors group"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-semibold truncate">{template.title}</h3>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(template)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => duplicateTemplate(template)} title="Duplicate">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => previewTemplate(template)} title="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(template.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                  )}

                  {(template.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {signerCount} signer{signerCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <LayoutGrid className="h-3 w-3" />
                      {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(template.created_at), "MMM d, yyyy")}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/documents/new?template=${template.id}`)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this template. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => !open && setEditTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>Update the template details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setEditTags(editTags.filter((t) => t !== tag))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button variant="outline" size="sm" onClick={addTag} disabled={!newTag.trim()}>Add</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving || !editTitle.trim()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>Template PDF preview</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {previewUrl && <PdfViewer url={previewUrl} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
