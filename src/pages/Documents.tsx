import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

type Document = Tables<"documents">;

const statusLabel: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  completed: "Completed",
  expired: "Expired",
  declined: "Declined",
};

const statusClass: Record<string, string> = {
  draft: "bg-[#eef1ea] text-[#3d4a3a] dark:bg-white/10 dark:text-[#d5e0cc]",
  pending: "bg-[#fff4df] text-[#8a5a00] dark:bg-[#3a2a0c] dark:text-[#f3c56b]",
  completed: "bg-[#e7f7c4] text-[#24520f] dark:bg-[#1b3114] dark:text-[#d6f59a]",
  expired: "bg-[#fde8e8] text-[#9f1239] dark:bg-[#3f1520] dark:text-[#fecdd3]",
  declined: "bg-[#fde8e8] text-[#9f1239] dark:bg-[#3f1520] dark:text-[#fecdd3]",
};

export default function Documents() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentOrg) return;
    setLoading(true);
    const fetchDocs = async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      setDocuments(data || []);
      setLoading(false);
    };
    fetchDocs();
  }, [user, currentOrg]);

  const filtered = documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (doc: Document) => {
    if (doc.file_path) await supabase.storage.from("documents").remove([doc.file_path]);
    if (doc.signed_file_path) await supabase.storage.from("documents").remove([doc.signed_file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast({ title: "Deleted", description: `"${doc.title}" has been deleted.` });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Documents</h1>
          <p className="mt-1 text-muted-foreground">
            {currentOrg ? `${currentOrg.name} · ${documents.length} document${documents.length === 1 ? "" : "s"}` : "Your document library"}
          </p>
        </div>
        <Button onClick={() => navigate("/documents/new")} className="gap-2 rounded-full">
          <Plus className="h-4 w-4" />
          New Document
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 border-input bg-secondary pl-9"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sidebar text-brand">
              <FileText className="h-6 w-6" />
            </div>
            <p className="font-display text-lg font-semibold">
              {documents.length === 0 ? "No documents yet" : "No documents match"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {documents.length === 0 ? "Create a document to see it here." : "Try a different search."}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((doc) => (
              <li key={doc.id} className="border-b border-border last:border-b-0">
                <div
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/documents/${doc.id}`);
                    }
                  }}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar text-brand">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[doc.status] || statusClass.draft}`}>
                    {statusLabel[doc.status] || doc.status}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-[#fde8e8] hover:text-[#9f1239]"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Delete ${doc.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{doc.title}" and all associated data.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(doc)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
