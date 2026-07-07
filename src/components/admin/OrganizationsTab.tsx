import { useState } from "react";
import { Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { OrgDetailDialog } from "./OrgDetailDialog";
import type { OrgRow } from "./types";

export function OrganizationsTab({
  organizations,
  onDelete,
  onOrgUpdated,
}: {
  organizations: OrgRow[];
  onDelete: (id: string) => void;
  onOrgUpdated: () => void;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Documents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.org_id}>
                  <TableCell className="font-medium">{org.org_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(org.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">{org.member_count}</TableCell>
                  <TableCell className="text-right">{org.document_count}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedOrgId(org.org_id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{org.org_name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this organization, its members, documents, and all related data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(org.org_id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {organizations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No organizations found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OrgDetailDialog
        orgId={selectedOrgId}
        open={!!selectedOrgId}
        onOpenChange={(open) => { if (!open) setSelectedOrgId(null); }}
        onSaved={() => { onOrgUpdated(); setSelectedOrgId(null); }}
      />
    </>
  );
}
