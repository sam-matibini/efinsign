import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Clock, CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

type Document = Tables<"documents">;
type StatusFilter = "all" | "pending" | "completed" | "other";

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

export default function Dashboard() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const filtered = documents.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "other"
        ? d.status !== "pending" && d.status !== "completed"
        : d.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const stats = useMemo(() => {
    const total = documents.length;
    const pending = documents.filter((d) => d.status === "pending").length;
    const completed = documents.filter((d) => d.status === "completed").length;
    const other = total - pending - completed;
    const completion = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, pending, completed, other, completion };
  }, [documents]);

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

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: stats.total },
    { id: "pending", label: "Awaiting", count: stats.pending },
    { id: "completed", label: "Completed", count: stats.completed },
    ...(stats.other > 0 || statusFilter === "other" ? [{ id: "other" as const, label: "Other", count: stats.other }] : []),
  ];

  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <Helmet>
        <title>Dashboard - eFinSign</title>
        <meta name="description" content="Manage your documents, track signatures, and view activity in your eFinSign dashboard." />
        <meta property="og:title" content="Dashboard - eFinSign" />
        <meta property="og:description" content="Manage your documents and signatures in eFinSign." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <section className="relative overflow-hidden bg-sidebar px-5 pb-16 pt-7 text-white sm:px-8 sm:pt-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand">Signing workspace</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              {currentOrg?.name ? `${currentOrg.name} · ` : ""}Documents, signatures, and what still needs a hand.
            </p>
          </div>
          <Button
            onClick={() => navigate("/documents/new")}
            className="h-11 gap-2 self-start rounded-full bg-brand px-5 font-semibold text-brand-foreground hover:bg-brand/90 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>
      </section>

      <div className="space-y-5 px-5 pb-8 sm:px-8">
        <section aria-labelledby="dashboard-stats-heading" className="relative z-10 -mt-10">
          <h2 id="dashboard-stats-heading" className="sr-only">Statistics</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard
              icon={FileText}
              value={stats.total}
              label="Total documents"
              detail={currentOrg?.name || "This workspace"}
            />
            <StatCard
              icon={Clock}
              value={stats.pending}
              label="Awaiting signature"
              detail={stats.pending > 0 ? "Still open" : "Nothing waiting"}
              detailClass={stats.pending > 0 ? "text-[#8a5a00] dark:text-[#f3c56b]" : undefined}
            />
            <StatCard
              icon={CheckCircle2}
              value={stats.completed}
              label="Completed"
              detail={`${stats.completion}% signed`}
              meter={stats.completion}
            />
          </div>
        </section>

        <section aria-labelledby="dashboard-docs-heading" className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_40px_-28px_rgba(11,31,51,0.55)]">
          <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="dashboard-docs-heading" className="font-display text-lg font-semibold">Documents</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading the register" : `${filtered.length} shown`}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter documents">
                {filters.map((filter) => {
                  const active = statusFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStatusFilter(filter.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-primary text-brand dark:bg-brand dark:text-brand-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                    >
                      {filter.label}
                      <span className="ml-1.5 tabular-nums opacity-80">{filter.count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 border-input bg-secondary pl-9"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
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
                {documents.length === 0
                  ? "Create your first document to get started."
                  : "Try another filter or clear the search."}
              </p>
              {documents.length === 0 && (
                <Button
                  onClick={() => navigate("/documents/new")}
                  className="mt-5 gap-2 rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  <Plus className="h-4 w-4" />
                  New Document
                </Button>
              )}
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
                    className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar text-brand">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[doc.status] || statusClass.draft}`}>
                      {statusLabel[doc.status] || doc.status}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-[#6d7c72] hover:bg-[#fde8e8] hover:text-[#9f1239]"
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
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  detail,
  detailClass,
  meter,
}: {
  icon: typeof FileText;
  value: number;
  label: string;
  detail: string;
  detailClass?: string;
  meter?: number;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-[0_16px_40px_-28px_rgba(11,31,51,0.65)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar text-brand">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className={`mt-1 text-sm ${detailClass || "text-muted-foreground"}`}>{detail}</p>
      {typeof meter === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-brand" style={{ width: `${meter}%` }} />
        </div>
      )}
    </article>
  );
}
