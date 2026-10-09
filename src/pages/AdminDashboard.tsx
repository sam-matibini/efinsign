import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

import { MetricsCards } from "@/components/admin/MetricsCards";
import { MetricsChart } from "@/components/admin/MetricsChart";
import { AdminsTab } from "@/components/admin/AdminsTab";
import { AddAdminTab } from "@/components/admin/AddAdminTab";
import { OrganizationsTab } from "@/components/admin/OrganizationsTab";
import { PricingTab } from "@/components/admin/PricingTab";
import { DocumentsTab } from "@/components/admin/DocumentsTab";
import { IntegrationsTab } from "@/components/admin/IntegrationsTab";
import type { AdminMetrics, PlatformAdmin, SearchResult, OrgRow } from "@/components/admin/types";

export default function AdminDashboard() {
  const { isPlatformAdmin, loading, user } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [organizations, setOrganizations] = useState<OrgRow[]>([]);

  const fetchAdmins = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_platform_admins" as any);
    if (!error && data) setAdmins(data as PlatformAdmin[]);
  }, []);

  const fetchOrganizations = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_organizations" as any);
    if (!error && data) setOrganizations(data as OrgRow[]);
  }, []);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_admin_metrics" as any);
        if (error) throw error;
        setMetrics(data as AdminMetrics);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setFetching(false);
      }
    })();
    fetchAdmins();
    fetchOrganizations();
  }, [isPlatformAdmin, fetchAdmins, fetchOrganizations]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data, error } = await supabase.rpc("admin_search_users" as any, { _query: searchQuery });
    if (!error && data) {
      const adminIds = new Set(admins.map((a) => a.user_id));
      setSearchResults((data as SearchResult[]).filter((u) => !adminIds.has(u.user_id)));
    }
    setSearching(false);
  };

  const handleGrant = async (targetUserId: string) => {
    const { error } = await supabase.rpc("admin_grant_role" as any, { _target_user_id: targetUserId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role granted" });
      setSearchResults((prev) => prev.filter((u) => u.user_id !== targetUserId));
      fetchAdmins();
    }
  };

  const handleRevoke = async (targetUserId: string) => {
    const { error } = await supabase.rpc("admin_revoke_role" as any, { _target_user_id: targetUserId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role revoked" });
      fetchAdmins();
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    const { error } = await supabase.rpc("admin_delete_organization" as any, { _org_id: orgId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organization deleted" });
      fetchOrganizations();
    }
  };

  if (loading) return null;
  if (!isPlatformAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
      </div>

      {fetching && <p className="text-muted-foreground">Loading metrics…</p>}
      {error && <p className="text-destructive">Error: {error}</p>}

      {metrics && (
        <>
          <MetricsCards metrics={metrics} />
          <MetricsChart metrics={metrics} />
        </>
      )}

      <Tabs defaultValue="orgs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orgs">Organizations</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="admins">Platform Admins</TabsTrigger>
          <TabsTrigger value="add">Add Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs">
          <OrganizationsTab organizations={organizations} onDelete={handleDeleteOrg} onOrgUpdated={fetchOrganizations} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingTab />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="admins">
          <AdminsTab admins={admins} currentUserId={user?.id} onRevoke={handleRevoke} onChanged={fetchAdmins} />
        </TabsContent>

        <TabsContent value="add">
          <AddAdminTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searching={searching}
            onSearch={handleSearch}
            searchResults={searchResults}
            onGrant={handleGrant}
            onChanged={fetchAdmins}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
