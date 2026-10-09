import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateSignedPdf } from "@/lib/pdfRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ArrowLeft, Copy, CheckCircle2, Clock, XCircle, Mail, PenTool, Trash2, Download, FileEdit, Share2, Printer, MessageCircle, Phone } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

interface EmailNotification {
  id: string;
  document_id: string;
  signer_id: string;
  email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Tables<"documents"> | null>(null);
  const [signers, setSigners] = useState<Tables<"document_signers">[]>([]);
  const [auditLogs, setAuditLogs] = useState<Tables<"audit_logs">[]>([]);
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [selfSigning, setSelfSigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [shareEmailOpen, setShareEmailOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const [docRes, signersRes, logsRes, notifsRes] = await Promise.all([
        supabase.from("documents").select("*").eq("id", id).single(),
        supabase.from("document_signers").select("*").eq("document_id", id).order("signing_order"),
        supabase.from("audit_logs").select("*").eq("document_id", id).order("created_at", { ascending: false }),
        supabase.from("email_notifications" as any).select("*").eq("document_id", id).order("created_at", { ascending: false }) as any,
      ]);
      setDoc(docRes.data);
      setSigners(signersRes.data || []);
      setAuditLogs(logsRes.data || []);
      setNotifications((notifsRes.data as EmailNotification[] | null) || []);
      setLoading(false);
    };
    load();
  }, [id, user]);

  const fetchNotifications = async () => {
    if (!id) return;
    const { data } = await supabase.from("email_notifications" as any).select("*").eq("document_id", id).order("created_at", { ascending: false }) as any;
    setNotifications((data as EmailNotification[] | null) || []);
  };

  const resendNotification = async (signerId: string) => {
    if (!id) return;
    setResendingId(signerId);
    try {
      const { data, error } = await supabase.functions.invoke("send-signing-notifications", {
        body: { document_id: id, signer_id: signerId },
      });
      if (error) throw error;
      toast.success("Notification resent successfully");
      await fetchNotifications();
    } catch (err: any) {
      toast.error(err.message || "Failed to resend notification");
    } finally {
      setResendingId(null);
    }
  };

  const fillAndSignYourself = async () => {
    if (!id || !user) return;
    setSelfSigning(true);
    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const name = profile?.full_name || user.email || "Document Owner";
      const email = user.email || "";

      // Create owner as a signer
      const { data: signer, error } = await supabase
        .from("document_signers")
        .insert({
          document_id: id,
          name,
          email,
          signing_order: 1,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to signing page
      navigate(`/sign?token=${signer.access_token}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start self-signing");
    } finally {
      setSelfSigning(false);
    }
  };

  const deleteDocument = async () => {
    if (!id || !doc) return;
    setDeleting(true);
    try {
      // Delete file from storage if exists
      if (doc.file_path) {
        await supabase.storage.from("documents").remove([doc.file_path]);
      }
      // Delete document row (cascading deletes handle related records)
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
      toast.success("Document deleted successfully");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
      setDeleting(false);
    }
  };

  const downloadDocument = async () => {
    if (!id) return;
    setDownloading(true);
    try {
      const signedPath = doc?.signed_file_path;
      const originalPath = doc?.file_path;

      let blob: Blob;
      if (signedPath) {
        const { data: urlData, error: urlErr } = await supabase.storage
          .from("documents")
          .createSignedUrl(signedPath, 60);
        if (urlErr || !urlData?.signedUrl) throw urlErr || new Error("Failed to create download URL");
        const resp = await fetch(urlData.signedUrl);
        if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
        blob = await resp.blob();
      } else if (originalPath && doc?.status === "completed") {
        // Completed but no cached signed file — generate on-the-fly
        try {
          const pdfData = await generateSignedPdf(id, originalPath);
          blob = new Blob([pdfData.slice(0)], { type: "application/pdf" });
        } catch (genErr: any) {
          console.warn("Signed PDF generation failed, falling back to original:", genErr);
          const { data: urlData, error: urlErr } = await supabase.storage
            .from("documents")
            .createSignedUrl(originalPath, 60);
          if (urlErr || !urlData?.signedUrl) throw urlErr || new Error("Failed to create download URL");
          const resp = await fetch(urlData.signedUrl);
          if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
          blob = await resp.blob();
        }
      } else if (originalPath) {
        // Draft / pending / declined — download the original PDF
        const { data: urlData, error: urlErr } = await supabase.storage
          .from("documents")
          .createSignedUrl(originalPath, 60);
        if (urlErr || !urlData?.signedUrl) throw urlErr || new Error("Failed to create download URL");
        const resp = await fetch(urlData.signedUrl);
        if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
        blob = await resp.blob();
      } else {
        throw new Error("No file available for download");
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc?.title || "document"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error(err?.message ? `Download failed: ${err.message}` : "Failed to download document. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const getPdfBlob = async (): Promise<Blob> => {
    const signedPath = doc?.signed_file_path;
    if (signedPath) {
      const { data: urlData, error: urlErr } = await supabase.storage
        .from("documents")
        .createSignedUrl(signedPath, 60);
      if (urlErr || !urlData?.signedUrl) throw urlErr || new Error("Failed to create URL");
      const resp = await fetch(urlData.signedUrl);
      return await resp.blob();
    } else if (doc?.file_path) {
      const pdfData = await generateSignedPdf(id!, doc.file_path);
      return new Blob([pdfData.slice(0)], { type: "application/pdf" });
    }
    throw new Error("No file available");
  };

  const printDocument = async () => {
    if (!id || !doc) return;
    setPrinting(true);
    try {
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
    } catch (err: any) {
      toast.error("Failed to print document. Please try again.");
    } finally {
      setPrinting(false);
    }
  };

  const shareViaEmail = async () => {
    if (!id || !shareEmail.trim()) return;
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("share-document", {
        body: { document_id: id, method: "email", recipient_email: shareEmail.trim() },
      });
      if (error) throw error;
      toast.success(`Document shared with ${shareEmail}`);
      setShareEmailOpen(false);
      setShareEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to share document");
    } finally {
      setSendingEmail(false);
    }
  };

  const shareViaLink = async (platform: "whatsapp" | "sms") => {
    if (!id || !doc) return;
    setGeneratingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke("share-document", {
        body: { document_id: id, method: "link" },
      });
      if (error) throw error;
      const url = data.url;
      const message = `Check out this signed document: "${doc.title}" — ${url}`;
      if (platform === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      } else {
        window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate sharing link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copySigningLink = (signer: Tables<"document_signers">) => {
    const link = `${window.location.origin}/sign?token=${signer.access_token}`;
    navigator.clipboard.writeText(link);
    toast.success(`Signing link copied for ${signer.name}`);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "signed": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "declined": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const signerNameById = (signerId: string) => {
    const signer = signers.find((s) => s.id === signerId);
    return signer?.name || "Unknown";
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!doc) return <div className="text-center py-12 text-muted-foreground">Document not found</div>;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
      <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{doc.title}</h1>
          <p className="text-muted-foreground mt-1">Created {format(new Date(doc.created_at), "MMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={doc.status === "completed" ? "default" : doc.status === "pending" ? "outline" : "secondary"}>
            {doc.status}
          </Badge>
          {(doc.file_path || doc.signed_file_path) && (
            <Button variant="outline" size="sm" onClick={downloadDocument} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" /> {downloading ? "Downloading..." : "Download"}
            </Button>
          )}
          {doc.status === "completed" && (doc.file_path || doc.signed_file_path) && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={generatingLink} className="gap-2">
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShareEmailOpen(true)}>
                    <Mail className="h-4 w-4 mr-2" /> Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareViaLink("whatsapp")}>
                    <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => shareViaLink("sms")}>
                    <Phone className="h-4 w-4 mr-2" /> SMS
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={printDocument} disabled={printing} className="gap-2">
                <Printer className="h-4 w-4" /> {printing ? "Printing..." : "Print"}
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete document">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{doc.title}" and all associated signers, fields, and notifications. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteDocument} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {doc.status === "draft" && (
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate(`/documents/${id}/prepare`)} variant="outline" className="gap-2">
            <PenTool className="h-4 w-4" /> Continue Preparing
          </Button>
          {doc.file_path && (
            <Button onClick={() => navigate(`/documents/${id}/edit`)} variant="outline" className="gap-2">
              <FileEdit className="h-4 w-4" /> Edit PDF
            </Button>
          )}
          <Button onClick={fillAndSignYourself} disabled={selfSigning} className="gap-2">
            <PenTool className="h-4 w-4" /> {selfSigning ? "Setting up..." : "Fill & Sign Yourself"}
          </Button>
        </div>
      )}

      {/* Signers */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader>
          <CardTitle className="font-display">Signers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {signers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No signers added yet</p>
          ) : (
            signers.map((signer) => (
              <div key={signer.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  {statusIcon(signer.status)}
                  <div>
                    <p className="font-medium text-sm">{signer.name}</p>
                    <p className="text-xs text-muted-foreground">{signer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">{signer.status}</Badge>
                  {signer.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => resendNotification(signer.id)} disabled={resendingId === signer.id} title="Resend notification">
                        <Mail className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copySigningLink(signer)} title="Copy signing link">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      {notifications.length > 0 && (
        <Card className="bg-card/60 border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Mail className="h-5 w-5" /> Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{signerNameById(n.signer_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{n.email}</TableCell>
                    <TableCell>
                      <Badge variant={n.status === "sent" ? "default" : "destructive"} className="capitalize">
                        {n.status}
                      </Badge>
                      {n.error_message && (
                        <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={n.error_message}>
                          {n.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(n.created_at), "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader>
          <CardTitle className="font-display">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                  <div>
                    <span className="capitalize font-medium">{log.event_type}</span>
                    {log.actor_email && <span className="text-muted-foreground ml-2">by {log.actor_email}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share via Email Dialog */}
      <Dialog open={shareEmailOpen} onOpenChange={setShareEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document via Email</DialogTitle>
            <DialogDescription>
              Enter the recipient's email address. They'll receive a download link valid for 1 hour.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            placeholder="recipient@example.com"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && shareViaEmail()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareEmailOpen(false)}>Cancel</Button>
            <Button onClick={shareViaEmail} disabled={sendingEmail || !shareEmail.trim()} className="gap-2">
              <Mail className="h-4 w-4" /> {sendingEmail ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
