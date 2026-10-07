import { errorResponse } from "./errors.ts";

type MemberOrg = { organization_id: string };

/**
 * Pick the caller's organization. `.single()` fails when a user belongs to
 * more than one organization, so the current org must be passed explicitly.
 */
export async function memberOrganization(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => { limit: (n: number) => Promise<{ data: MemberOrg[] | null; error: { message: string } | null }> };
          limit: (n: number) => Promise<{ data: MemberOrg[] | null; error: { message: string } | null }>;
        };
      };
    };
  },
  userId: string,
  organizationId?: string | null,
): Promise<MemberOrg | Response> {
  const filtered = supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);

  const { data, error } = organizationId
    ? await filtered.eq("organization_id", organizationId).limit(1)
    : await filtered.limit(2);

  if (error) return errorResponse(500, "db_error", error.message);
  if (!data || data.length === 0) {
    return errorResponse(400, "no_organization", "User is not a member of this organization");
  }
  if (!organizationId && data.length > 1) {
    return errorResponse(400, "organization_required", "organization_id is required when the user belongs to more than one organization");
  }
  return data[0];
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
