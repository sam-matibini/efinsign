import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { syncSealCache } from "@/lib/orgSeal";

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  domain: string | null;
  created_at: string;
  address: string | null;
  email: string | null;
  telephone: string | null;
  cell_number: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  seal_stamp?: string | null;
  seal_logo?: string | null;
}

interface OrgMembership {
  organization_id: string;
  role: string;
  organizations: Organization;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  orgs: Organization[];
  role: string | null;
  loading: boolean;
  switchOrg: (orgId: string) => void;
  createOrg: (name: string) => Promise<string | null>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const ORG_STORAGE_KEY = "efinsign_current_org";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(() => {
    try { return localStorage.getItem(ORG_STORAGE_KEY); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrgs([]);
      setRoles({});
      setCurrentOrgId(null);
      setLoading(false);
      return;
    }

    const fetchOrgs = async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, role, organizations(*)")
        .eq("user_id", user.id);

      if (error || !data) {
        setOrgs([]);
        setLoading(false);
        return;
      }

      const memberships = data as unknown as OrgMembership[];
      const orgList = memberships.map((m) => m.organizations);
      const roleMap: Record<string, string> = {};
      memberships.forEach((m) => { roleMap[m.organization_id] = m.role; });

      setOrgs(orgList);
      setRoles(roleMap);

      // Set current org
      const savedId = localStorage.getItem(ORG_STORAGE_KEY);
      if (savedId && orgList.some((o) => o.id === savedId)) {
        setCurrentOrgId(savedId);
      } else if (orgList.length > 0) {
        setCurrentOrgId(orgList[0].id);
        localStorage.setItem(ORG_STORAGE_KEY, orgList[0].id);
      }
      setLoading(false);
    };

    fetchOrgs();
  }, [user]);

  const switchOrg = (orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem(ORG_STORAGE_KEY, orgId);
  };

  const createOrg = async (name: string): Promise<string | null> => {
    if (!user) return null;
    const { data: newOrgId, error: rpcError } = await supabase
      .rpc("create_organization_with_admin", { _name: name });
    if (rpcError || !newOrgId) {
      console.error("Error creating organization:", rpcError);
      return null;
    }

    // Fetch the newly created org
    const { data: orgData, error: fetchError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", newOrgId)
      .single();
    if (fetchError || !orgData) {
      console.error("Error fetching new organization:", fetchError);
      return null;
    }

    const org = orgData as unknown as Organization;
    setOrgs((prev) => [...prev, org]);
    setRoles((prev) => ({ ...prev, [org.id]: "admin" }));
    switchOrg(org.id);
    return org.id;
  };

  const currentOrg = orgs.find((o) => o.id === currentOrgId) || null;
  const role = currentOrgId ? roles[currentOrgId] || null : null;

  useEffect(() => {
    if (!currentOrg) {
      syncSealCache(null);
      return;
    }
    syncSealCache(currentOrg.id, currentOrg.seal_stamp, currentOrg.seal_logo);
  }, [currentOrg]);

  return (
    <OrganizationContext.Provider value={{ currentOrg, orgs, role, loading, switchOrg, createOrg }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error("useOrganization must be used within OrganizationProvider");
  return context;
}
