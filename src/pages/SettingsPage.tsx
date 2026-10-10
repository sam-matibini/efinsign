import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { readAccountTitle, writeAccountTitle } from "@/lib/accountProfile";
import { upsertOwnProfile } from "@/lib/upsertOwnProfile";

export default function SettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.full_name) setFullName(data.full_name); });
    setJobTitle(readAccountTitle(user.id, (user.user_metadata as { job_title?: string } | undefined)?.job_title));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await upsertOwnProfile(user.id, fullName);
    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }
    writeAccountTitle(user.id, jobTitle.trim());
    await supabase.auth.updateUser({ data: { job_title: jobTitle.trim() } });
    toast.success("Profile updated");
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in space-y-6">
      <h1 className="text-3xl font-display font-bold">Settings</h1>

      <Card className="bg-card/60 border-border/50">
        <CardHeader>
          <CardTitle className="font-display">Profile</CardTitle>
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
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Partner" />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
