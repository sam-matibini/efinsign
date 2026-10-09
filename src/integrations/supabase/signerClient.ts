// Token-scoped Supabase client used by the public signing flow.
// Sends the signer's access token as the `x-signer-token` header so RLS
// policies can verify the caller without trusting the anon JWT.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function createSignerClient(token: string): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `signer-${token}`,
    },
    global: {
      headers: {
        "x-signer-token": token,
      },
    },
  });
}
