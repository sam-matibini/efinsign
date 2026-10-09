export interface Document {
  id: string;
  title: string;
  status: "draft" | "pending" | "completed" | "expired" | "declined";
  file_path: string | null;
  signed_file_path: string | null;
  organization_id: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetail extends Document {
  signers: SignerWithFields[];
  fields: Field[];
}

export interface Signer {
  id: string;
  document_id: string;
  name: string;
  email: string;
  signing_order: number;
  status: "pending" | "viewed" | "signed" | "declined";
  color: string;
  signed_at: string | null;
  decline_reason: string | null;
  created_at: string;
}

export interface SignerWithFields extends Signer {
  fields: Field[];
}

export interface Field {
  id: string;
  document_id: string;
  signer_id: string;
  field_type: "signature" | "initials" | "name" | "date" | "text" | "checkbox" | "checkmark" | "full_name" | "title";
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | null;
  label: string | null;
}

export interface FieldInput {
  type?: string;
  page?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  label?: string;
}

export interface Template {
  id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  signers: Record<string, unknown>[];
  fields: Record<string, unknown>[];
  tags: string[];
  created_at: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_attempt_at: string | null;
  last_success_at: string | null;
  failure_count: number;
  created_at: string;
}

export interface WebhookInput {
  url: string;
  events: string[];
}

export interface WebhookCreated extends Webhook {
  secret: string;
  message: string;
}

export interface Organization {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  telephone: string | null;
  cell_number: string | null;
  logo_url: string | null;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  created_at: string;
}

export interface ClientInput {
  name: string;
  email?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
}

export interface Usage {
  total_documents: number;
  pending_documents: number;
  api_calls: number;
  api_call_limit: number;
}

export interface SigningUrlResult {
  url: string;
  signing_url: string;
  embed_url: string;
  signer_email: string;
  signer_name: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiInfo {
  name: string;
  version: string;
  status: string;
  timestamp: string;
}

export class eFinSignError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "eFinSignError";
    this.code = code;
    this.status = status;
  }
}
