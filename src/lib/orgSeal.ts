const key = (orgId: string) => `efinsign_org_seal_${orgId}`;

export function readOrgSeal(orgId: string | null | undefined, fromDb?: string | null): string | null {
  if (fromDb) return fromDb;
  if (!orgId) return null;
  try {
    return localStorage.getItem(key(orgId));
  } catch {
    return null;
  }
}

export function writeOrgSeal(orgId: string, stamp: string | null) {
  try {
    if (!stamp) localStorage.removeItem(key(orgId));
    else localStorage.setItem(key(orgId), stamp);
  } catch {
    /* ignore */
  }
}
