export interface AdminMetrics {
  total_organizations: number;
  total_documents: number;
  documents_completed: number;
  documents_pending: number;
  documents_this_month: number;
  total_users: number;
  total_signatures: number;
}

export interface PlatformAdmin {
  user_id: string;
  full_name: string;
}

export interface SearchResult {
  user_id: string;
  full_name: string;
}

export interface OrgRow {
  org_id: string;
  org_name: string;
  created_at: string;
  member_count: number;
  document_count: number;
}

export interface OrgDetail {
  org: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    telephone: string | null;
    cell_number: string | null;
    logo_url: string | null;
    domain: string | null;
    created_at: string;
  };
  members: OrgMember[];
}

export interface OrgMember {
  user_id: string;
  role: string;
  full_name: string;
  joined_at: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  period: string;
  max_documents: number | null;
  max_users: number | null;
  features: string[];
  highlighted: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
