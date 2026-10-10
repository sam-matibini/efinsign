const stampKey = (orgId: string) => `efinsign_org_seal_${orgId}`;
const logoKey = (orgId: string) => `efinsign_org_seal_logo_${orgId}`;

let cachedLogo: string | null = null;

export function getActiveSealLogo(): string | null {
  return cachedLogo;
}

export function setActiveSealLogo(logo: string | null) {
  cachedLogo = logo;
}

export function readOrgSeal(orgId: string | null | undefined, fromDb?: string | null): string | null {
  if (fromDb) return fromDb;
  if (!orgId) return null;
  try {
    return localStorage.getItem(stampKey(orgId));
  } catch {
    return null;
  }
}

export function writeOrgSeal(orgId: string, stamp: string | null) {
  try {
    if (!stamp) localStorage.removeItem(stampKey(orgId));
    else localStorage.setItem(stampKey(orgId), stamp);
  } catch {
    /* ignore */
  }
}

export function readOrgSealLogo(orgId: string | null | undefined, fromDb?: string | null): string | null {
  if (fromDb) {
    cachedLogo = fromDb;
    return fromDb;
  }
  if (!orgId) return cachedLogo;
  try {
    const stored = localStorage.getItem(logoKey(orgId));
    if (stored) cachedLogo = stored;
    return stored;
  } catch {
    return cachedLogo;
  }
}

export function writeOrgSealLogo(orgId: string, logo: string | null) {
  cachedLogo = logo;
  try {
    if (!logo) localStorage.removeItem(logoKey(orgId));
    else localStorage.setItem(logoKey(orgId), logo);
  } catch {
    /* ignore */
  }
}

export function syncSealCache(orgId: string | null | undefined, stampFromDb?: string | null, logoFromDb?: string | null) {
  if (!orgId) {
    cachedLogo = null;
    return;
  }
  readOrgSeal(orgId, stampFromDb);
  readOrgSealLogo(orgId, logoFromDb);
}

export function normalizeLogoDataUrl(dataUrl: string, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Could not read the logo"));
    img.src = dataUrl;
  });
}

export async function fileToSealLogo(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
  return normalizeLogoDataUrl(raw);
}
