import { useState } from "react";
import { Search, UserPlus, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SearchResult } from "./types";

export function AddAdminTab({
  searchQuery,
  setSearchQuery,
  searching,
  onSearch,
  searchResults,
  onGrant,
  onChanged,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searching: boolean;
  onSearch: () => void;
  searchResults: SearchResult[];
  onGrant: (id: string) => void;
  onChanged?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [grantingEmail, setGrantingEmail] = useState(false);

  const grantByEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter an email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Invalid email address");
      return;
    }
    setGrantingEmail(true);
    const { error } = await supabase.rpc("admin_grant_role_by_email" as any, { _email: trimmed });
    if (error) toast.error(error.message);
    else {
      toast.success("Platform admin granted");
      setEmail("");
      onChanged?.();
    }
    setGrantingEmail(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add by Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Email address</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="person@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !grantingEmail && grantByEmail()}
                maxLength={255}
              />
              <Button onClick={grantByEmail} disabled={grantingEmail}>
                <Mail className="h-4 w-4 mr-1" />
                {grantingEmail ? "Granting..." : "Grant Admin"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The user must already have an account.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Users by Name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
            <Button onClick={onSearch} disabled={searching}>
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
          </div>
          {searchResults.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{u.user_id}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => onGrant(u.user_id)}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Grant Admin
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
