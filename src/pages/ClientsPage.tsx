import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Search, Users, Pencil, Trash2, Building2, MapPin } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
}

export default function ClientsPage() {
  const { currentOrg } = useOrganization();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (!currentOrg) return;
    const load = async () => {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      setClients((data as unknown as Client[]) || []);
      setLoading(false);
    };
    load();
  }, [currentOrg]);

  const resetForm = () => {
    setName(""); setEmail(""); setCompany("");
    setAddress(""); setCity(""); setPostalCode(""); setCountry("");
  };

  const openCreate = () => {
    setEditingClient(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setName(c.name);
    setEmail(c.email || "");
    setCompany(c.company || "");
    setAddress(c.address || "");
    setCity(c.city || "");
    setPostalCode(c.postal_code || "");
    setCountry(c.country || "");
    setDialogOpen(true);
  };

  const getPayload = () => ({
    name,
    email: email || null,
    company: company || null,
    address: address || null,
    city: city || null,
    postal_code: postalCode || null,
    country: country || null,
  });

  const handleSave = async () => {
    if (!currentOrg || !name.trim()) return;
    if (editingClient) {
      const { error } = await supabase
        .from("clients")
        .update(getPayload() as any)
        .eq("id", editingClient.id);
      if (error) { toast.error("Failed to update"); return; }
      setClients((prev) => prev.map((c) =>
        c.id === editingClient.id ? { ...c, ...getPayload() } : c
      ));
      toast.success("Client updated");
    } else {
      const { data, error } = await supabase
        .from("clients")
        .insert({ organization_id: currentOrg.id, ...getPayload() } as any)
        .select()
        .single();
      if (error) { toast.error("Failed to create"); return; }
      setClients((prev) => [data as unknown as Client, ...prev]);
      toast.success("Client created");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("clients").delete().eq("id", deleteId);
    setClients((prev) => prev.filter((c) => c.id !== deleteId));
    setDeleteId(null);
    toast.success("Client deleted");
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatAddress = (c: Client) => {
    const parts = [c.address, c.city, c.postal_code, c.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your organization's clients</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {clients.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-lg">{search ? "No clients match your search" : "No clients yet"}</p>
              {!search && (
                <Button onClick={openCreate} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> Add Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filtered.map((client) => {
            const addr = formatAddress(client);
            return (
              <Card key={client.id} className="bg-card border-border hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {client.email && <span>{client.email}</span>}
                        {client.email && client.company && <span>·</span>}
                        {client.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {client.company}
                          </span>
                        )}
                      </div>
                      {addr && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{addr}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(client)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(client.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit Client" : "Add Client"}</DialogTitle>
            <DialogDescription>{editingClient ? "Update client details." : "Add a new client to your organization."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@company.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="10001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>{editingClient ? "Save" : "Add Client"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this client.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
