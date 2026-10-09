import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FilePenLine, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

type Document = Tables<"documents">;

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  expired: { label: "Expired", variant: "destructive" },
  declined: { label: "Declined", variant: "destructive" },
};

export default function PdfEditorLanding() {
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
        .not("file_path", "is", null)
        .order("updated_at", { ascending: false });
      setDocuments(data || []);
      setLoading(false);
    };
    fetchDocs();
  }, [user, currentOrg]);

  const handleDelete = async (doc: Document) => {
    if (doc.file_path) {
      await supabase.storage.from("documents").remove([doc.file_path]);
    }
    if (doc.signed_file_path) {
      await supabase.storage.from("documents").remove([doc.signed_file_path]);
    }
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast({ title: "Deleted", description: `"${doc.title}" has been deleted.` });
  };

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">PDF Editor</h1>
          <p className="text-muted-foreground mt-1">Select a document to edit</p>
        </div>
        <Button onClick={() => navigate("/documents/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Upload New
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="col-span-full bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-lg">No documents with PDF files</p>
              <p className="text-muted-foreground/70 text-sm mt-1">Upload a document to start editing</p>
              <Button onClick={() => navigate("/documents/new")} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Upload New
              </Button>
            </CardContent>
          </Card>
        ) : (
          filtered.map((doc) => (
            <Card key={doc.id} className="bg-card border-border hover:bg-muted/50 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(doc.updated_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusConfig[doc.status]?.variant || "secondary"}>
                    {statusConfig[doc.status]?.label || doc.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => navigate(`/documents/${doc.id}/edit`)}
                  >
                    <FilePenLine className="h-4 w-4" />
                    Edit PDF
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
