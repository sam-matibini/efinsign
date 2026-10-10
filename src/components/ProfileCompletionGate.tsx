import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { upsertOwnProfile } from "@/lib/upsertOwnProfile";

export function ProfileCompletionGate() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const name = (data?.full_name || "").trim();
      if (!name) {
        // Try metadata as a seed
        const metaName = (user.user_metadata as any)?.full_name || "";
        setFullName(metaName);
        setOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleSave = async () => {
    if (!user || !fullName.trim()) return;
    setSaving(true);
    const { error } = await upsertOwnProfile(user.id, fullName);
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Welcome!");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>
            Tell us your name so your teammates can recognize you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="profile-fullname">Full Name</Label>
          <Input
            id="profile-fullname"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!fullName.trim() || saving}>
            {saving ? "Saving..." : "Save & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
