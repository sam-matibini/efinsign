import { useState } from "react";
import { Pencil, UserMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PlatformAdmin } from "./types";

export function AdminsTab({
  admins,
  currentUserId,
  onRevoke,
  onChanged,
}: {
  admins: PlatformAdmin[];
  currentUserId: string | undefined;
  onRevoke: (id: string) => void;
  onChanged?: () => void;
}) {
  const [editing, setEditing] = useState<PlatformAdmin | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = (admin: PlatformAdmin) => {
    setEditing(admin);
    setName(admin.full_name === "Unknown" ? "" : admin.full_name);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_update_user_name" as any, {
      _user_id: editing.user_id,
      _full_name: name.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Name updated");
      setEditing(null);
      onChanged?.();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Current Platform Admins</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.user_id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <span>{admin.full_name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => openEdit(admin)}
                      title="Edit name"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">{admin.user_id}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={admin.user_id === currentUserId}
                    onClick={() => onRevoke(admin.user_id)}
                  >
                    <UserMinus className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {admins.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">No platform admins found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit admin name</DialogTitle>
            <DialogDescription>
              Set a display name for this platform admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
