import { supabase } from "@/integrations/supabase/client";
import { isSealField, sealFromField } from "@/lib/companySeals";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type DocField = Tables<"document_fields">;
export { isSealField, sealFromField };

export async function insertDocumentField(row: TablesInsert<"document_fields">) {
  const first = await supabase.from("document_fields").insert(row).select().single();
  if (!first.error) return first;
  const constraint = /field_type|document_fields_field_type_check/i.test(first.error.message || "");
  if (row.field_type === "seal" && constraint) {
    return supabase.from("document_fields").insert({ ...row, field_type: "text" }).select().single();
  }
  return first;
}
