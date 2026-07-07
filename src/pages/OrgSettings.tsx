import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Users, Mail, Clock, X, Pencil, Check, Star, PenTool, User, Send } from "lucide-react";
import SignatureCapture from "@/components/SignatureCapture";
import { SubscriptionCard } from "@/components/SubscriptionCard";

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  full_name?: string;
  email?: string;
  display?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface SavedSignature {
  id: string;
  image_data: string;
  type: string;
  label: string | null;
  is_default: boolean;
  created_at: string;
}

export default function OrgSettings() {
  const { currentOrg, role } = useOrganization();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgCity, setOrgCity] = useState("");
  const [orgPostalCode, setOrgPostalCode] = useState("");
  const [orgCountry, setOrgCountry] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgTelephone, setOrgTelephone] = useState("");
  const [orgCellNumber, setOrgCellNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [savingMemberName, setSavingMemberName] = useState(false);
  const [seatUsage, setSeatUsage] = useState<{ has_subscription: boolean; plan_name: string | null; max_users: number | null; members: number; pending_invites: number; used: number; remaining: number | null } | null>(null);

  // Signature management
  const [signatures, setSignatures] = useState<SavedSignature[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"signature" | "initials">("signature");

  const isAdmin = role === "admin";

  useEffect(() => {
    if (!currentOrg) return;
    setOrgName(currentOrg.name);
    setOrgAddress(currentOrg.address || "");
    setOrgCity(currentOrg.city || "");
    setOrgPostalCode(currentOrg.postal_code || "");
    setOrgCountry(currentOrg.country || "");
    setOrgEmail(currentOrg.email || "");
    setOrgTelephone(currentOrg.telephone || "");
    setOrgCellNumber(currentOrg.cell_number || "");
    fetchMembers();
    fetchInvitations();
    fetchSignatures();
    fetchSeatUsage();
  }, [currentOrg]);

  const fetchSeatUsage = async () => {
    if (!currentOrg) return;
    const { data, error } = await supabase.rpc("get_org_seat_usage", { _org_id: currentOrg.id });
    if (!error && data) setSeatUsage(data as any);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.full_name) setFullName(data.full_name); });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
    setSavingProfile(false);
  };

  const fetchMembers = async () => {
    if (!currentOrg) return;
    setLoadingMembers(true);
    const { data, error: memErr } = await supabase
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: true });

    if (memErr) {
      toast.error(memErr.message);
      setLoadingMembers(false);
      return;
    }

    if (data) {
      const { data: details, error: detailErr } = await supabase.rpc(
        "get_org_member_emails",
        { _org_id: currentOrg.id }
      );
      if (detailErr) toast.error(detailErr.message);

      const nameMap: Record<string, string> = {};
      const emailMap: Record<string, string> = {};
      (details || []).forEach((e: any) => {
        nameMap[e.user_id] = (e.full_name || "").trim();
        emailMap[e.user_id] = e.email || "";
      });

      setMembers(data.map((m: any) => {
        const name = nameMap[m.user_id] || "";
        const email = emailMap[m.user_id] || "";
        return {
          ...m,
          full_name: name,
          email,
          display: name || email || "Unknown member",
        };
      }));
    }
    setLoadingMembers(false);
  };

  const openEditMember = (member: Member) => {
    setEditMember(member);
    setEditMemberName(member.full_name || "");
  };

  const handleSaveMemberName = async () => {
    if (!editMember || !currentOrg) return;
    setSavingMemberName(true);
    const trimmed = editMemberName.trim();
    const { error } = await supabase.rpc("admin_update_member_name", {
      _org_id: currentOrg.id,
      _user_id: editMember.user_id,
      _full_name: trimmed,
    });
    if (error) {
      toast.error(error.message);
      setSavingMemberName(false);
      return;
    }
    // Optimistically update the row so the UI reflects the new name immediately.
    setMembers((prev) =>
      prev.map((m) =>
        m.user_id === editMember.user_id
          ? { ...m, full_name: trimmed, display: trimmed || m.email || "Unknown member" }
          : m
      )
    );
    toast.success("Name updated");
    setEditMember(null);
    setSavingMemberName(false);
    await fetchMembers();
  };

  const fetchInvitations = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from("org_invitations")
      .select("id, email, role, status, created_at, expires_at")
      .eq("organization_id", currentOrg.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setInvitations((data as Invitation[]) || []);
  };

  const handleSaveOrg = async () => {
    if (!currentOrg || !isAdmin) return;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name: orgName,
        address: orgAddress || null,
        city: orgCity || null,
        postal_code: orgPostalCode || null,
        country: orgCountry || null,
        email: orgEmail || null,
        telephone: orgTelephone || null,
        cell_number: orgCellNumber || null,
      } as any)
      .eq("id", currentOrg.id);
    if (error) toast.error("Failed to update");
    else toast.success("Organization updated");
    setSaving(false);
  };

  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-org-invitation", {
        body: {
          organization_id: currentOrg.id,
          email: inviteEmail.trim(),
          role: inviteRole,
          origin: window.location.origin,
        },
      });

      if (error) {
        toast.error(error.message || "Failed to send invitation");
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Invitation sent!");
        setInviteOpen(false);
        setInviteEmail("");
        setInviteRole("viewer");
        fetchInvitations();
        fetchSeatUsage();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    }
    setInviting(false);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from("org_invitations")
      .delete()
      .eq("id", invitationId);
    if (error) toast.error("Failed to cancel invitation");
    else {
      toast.success("Invitation cancelled");
      fetchInvitations();
      fetchSeatUsage();
    }
  };

  const handleResendInvitation = async (inv: Invitation) => {
    if (!currentOrg) return;
    try {
      const { data, error } = await supabase.functions.invoke("send-org-invitation", {
        body: {
          organization_id: currentOrg.id,
          email: inv.email,
          role: inv.role,
          origin: window.location.origin,
        },
      });
      if (error) toast.error(error.message || "Failed to resend invitation");
      else if (data?.error) toast.error(data.error);
      else {
        toast.success(data?.resent ? "Invitation resent" : "Invitation sent");
        fetchInvitations();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invitation");
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", deleteId);
    if (error) toast.error("Failed to remove member");
    else {
      toast.success("Member removed");
      fetchMembers();
      fetchSeatUsage();
    }
    setDeleteId(null);
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from("organization_members")
      .update({ role: newRole } as any)
      .eq("id", memberId);
    if (error) toast.error("Failed to update role");
    else {
      toast.success("Role updated");
      fetchMembers();
    }
  };

  // Signature management functions
  const fetchSignatures = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from("saved_signatures")
      .select("*")
      .eq("organization_id", currentOrg.id as any)
      .order("created_at", { ascending: false });
    if (data) setSignatures(data as any);
  };

  const handleRenameSig = async (id: string) => {
    const { error } = await supabase.from("saved_signatures").update({ label: editLabel }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Renamed");
      setEditingId(null);
      fetchSignatures();
    }
  };

  const handleDeleteSig = async (id: string) => {
    const { error } = await supabase.from("saved_signatures").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      fetchSignatures();
    }
  };

  const handleSetDefault = async (sig: SavedSignature) => {
    await supabase
      .from("saved_signatures")
      .update({ is_default: false } as any)
      .eq("organization_id", currentOrg!.id as any)
      .eq("type", sig.type);
    const { error } = await supabase
      .from("saved_signatures")
      .update({ is_default: true } as any)
      .eq("id", sig.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Set as default");
      fetchSignatures();
    }
  };

  const handleCreateSignature = async (imageData: string) => {
    if (!user || !currentOrg) return;
    const { error } = await supabase.from("saved_signatures").insert({
      user_id: user.id,
      organization_id: currentOrg.id as any,
      image_data: imageData,
      type: createType,
      label: createType === "signature" ? "My Signature" : "My Initials",
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved!");
      setCreateOpen(false);
      fetchSignatures();
    }
  };

  const roleColors: Record<string, string> = {
    admin: "text-primary",
    manager: "text-primary/80",
    signer: "text-primary/60",
    viewer: "text-muted-foreground",
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      <h1 className="text-3xl font-display font-bold">Settings</h1>

      {/* Subscription */}
      <SubscriptionCard />

      {/* Profile */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <Button onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Org Details */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader>
          <CardTitle className="font-display">Organization Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label>Street Address</Label>
            <Input value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} disabled={!isAdmin} placeholder="123 Main Street" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={orgCity} onChange={(e) => setOrgCity(e.target.value)} disabled={!isAdmin} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input value={orgPostalCode} onChange={(e) => setOrgPostalCode(e.target.value)} disabled={!isAdmin} placeholder="10001" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={orgCountry} onChange={(e) => setOrgCountry(e.target.value)} disabled={!isAdmin} placeholder="Country" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} disabled={!isAdmin} placeholder="org@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Telephone</Label>
              <Input type="tel" value={orgTelephone} onChange={(e) => setOrgTelephone(e.target.value)} disabled={!isAdmin} placeholder="+1 (555) 000-0000" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cell Number</Label>
            <Input type="tel" value={orgCellNumber} onChange={(e) => setOrgCellNumber(e.target.value)} disabled={!isAdmin} placeholder="+1 (555) 000-0000" />
          </div>
          {isAdmin && (
            <Button onClick={handleSaveOrg} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Saved Signatures & Initials */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Signatures & Initials
          </CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create {createType === "signature" ? "Signature" : "Initials"}</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mb-3">
                <Button size="sm" variant={createType === "signature" ? "default" : "outline"} onClick={() => setCreateType("signature")}>Signature</Button>
                <Button size="sm" variant={createType === "initials" ? "default" : "outline"} onClick={() => setCreateType("initials")}>Initials</Button>
              </div>
              <SignatureCapture onSave={handleCreateSignature} saveLabel="Save" compact />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {signatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved signatures yet.</p>
          ) : (
            <div className="space-y-3">
              {signatures.map((sig) => (
                <div key={sig.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
                  <div className="w-32 h-16 rounded border border-border/30 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    <img src={sig.image_data} alt="Signature" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === sig.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && handleRenameSig(sig.id)} />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRenameSig(sig.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium truncate block">{sig.label || "Untitled"}</span>
                    )}
                    <Badge variant="secondary" className="mt-1 text-[10px]">{sig.type}</Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className={`h-8 w-8 ${sig.is_default ? "text-yellow-500" : "text-muted-foreground"}`} onClick={() => handleSetDefault(sig)} title={sig.is_default ? "Default" : "Set as default"}>
                      <Star className={`h-3.5 w-3.5 ${sig.is_default ? "fill-yellow-500" : ""}`} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(sig.id); setEditLabel(sig.label || ""); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteSig(sig.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members
              {seatUsage && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {seatUsage.used}
                  {seatUsage.max_users !== null ? ` / ${seatUsage.max_users}` : ""} seats
                </Badge>
              )}
            </CardTitle>
            {seatUsage && (
              <p className="text-xs text-muted-foreground mt-1">
                {seatUsage.max_users === null
                  ? `${seatUsage.plan_name || "Current plan"} — unlimited members`
                  : seatUsage.remaining === 0
                    ? `Seat limit reached on ${seatUsage.plan_name || "current plan"}. Upgrade to invite more.`
                    : `${seatUsage.remaining} of ${seatUsage.max_users} seats remaining${seatUsage.plan_name ? ` on ${seatUsage.plan_name}` : ""}`}
              </p>
            )}
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setInviteOpen(true)}
              disabled={seatUsage?.remaining === 0}
              title={seatUsage?.remaining === 0 ? "Seat limit reached — upgrade your plan" : undefined}
            >
              <Plus className="h-3.5 w-3.5" /> Invite
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                      <Shield className={`h-4 w-4 ${roleColors[member.role] || ""}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{member.display}</p>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0"
                            onClick={() => openEditMember(member)}
                            title="Edit name"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {member.full_name && member.email && (
                        <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                      )}
                      {isAdmin && member.user_id !== user?.id ? (
                        <Select value={member.role} onValueChange={(v) => handleRoleChange(member.id, v)}>
                          <SelectTrigger className="h-6 text-xs w-auto border-none bg-transparent p-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="signer">Signer</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">{member.role}</Badge>
                      )}
                    </div>
                  </div>
                  {isAdmin && member.user_id !== user?.id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(member.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isAdmin && invitations.length > 0 && (
        <Card className="bg-card/60 border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{inv.email}</p>
                      <Badge variant="secondary" className="text-[10px]">{inv.role}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleResendInvitation(inv)}
                      title="Resend invitation email"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleCancelInvitation(inv.id)}
                      title="Cancel invitation"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Send an email invitation to join your organization.</DialogDescription>
          </DialogHeader>
          {seatUsage && (
            <div className="text-xs rounded-md border border-border/50 bg-secondary/30 px-3 py-2">
              {seatUsage.max_users === null ? (
                <>Unlimited seats on <strong>{seatUsage.plan_name || "current plan"}</strong>.</>
              ) : (
                <>
                  <strong>{seatUsage.used}</strong> of <strong>{seatUsage.max_users}</strong> seats used
                  {seatUsage.plan_name ? <> on <strong>{seatUsage.plan_name}</strong></> : null}
                  {seatUsage.remaining === 0 && (
                    <span className="block text-destructive mt-1">Seat limit reached — upgrade your plan to invite more members.</span>
                  )}
                </>
              )}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@company.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="signer">Signer</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviting || seatUsage?.remaining === 0}
            >
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>This person will lose access to the organization.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Member Name Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member name</DialogTitle>
            <DialogDescription>
              Set a display name for {editMember?.email || "this member"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={editMemberName}
              onChange={(e) => setEditMemberName(e.target.value)}
              placeholder="e.g. Jane Doe"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveMemberName()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button onClick={handleSaveMemberName} disabled={savingMemberName}>
              {savingMemberName ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
