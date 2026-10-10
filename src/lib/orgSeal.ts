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

/** Find the circular company mark inside a padded app-icon style image. */
export function markBounds(data: Uint8ClampedArray, width: number, height: number) {
  const corner = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  };
  const samples = [corner(2, 2), corner(width - 3, 2), corner(2, height - 3), corner(width - 3, height - 3)];
  const bg = {
    r: samples.reduce((s, p) => s + p.r, 0) / 4,
    g: samples.reduce((s, p) => s + p.g, 0) / 4,
    b: samples.reduce((s, p) => s + p.b, 0) / 4,
  };
  const isBg = (r: number, g: number, b: number, a: number) => {
    if (a < 20) return true;
    const dr = r - bg.r;
    const dg = g - bg.g;
    const db = b - bg.b;
    return dr * dr + dg * dg + db * db < 48 * 48;
  };

  const cx = width / 2;
  const cy = height / 2;
  let maxR = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isBg(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (r > maxR) maxR = r;
    }
  }
  if (maxR < 8) return { cx, cy, radius: Math.min(width, height) / 2 };
  const cornerR = Math.hypot(width / 2, height / 2);
  if (maxR > cornerR * 0.82) return { cx, cy, radius: Math.min(width, height) / 2 };
  return { cx, cy, radius: maxR };
}

export function normalizeLogoDataUrl(dataUrl: string, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const src = document.createElement("canvas");
      src.width = img.naturalWidth || img.width || size;
      src.height = img.naturalHeight || img.height || size;
      const srcCtx = src.getContext("2d");
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!srcCtx || !ctx) {
        resolve(dataUrl);
        return;
      }
      srcCtx.drawImage(img, 0, 0, src.width, src.height);
      const pixels = srcCtx.getImageData(0, 0, src.width, src.height);
      const mark = markBounds(pixels.data, src.width, src.height);
      const pad = mark.radius * 0.04;
      const side = Math.max(8, (mark.radius + pad) * 2);
      const sx = mark.cx - side / 2;
      const sy = mark.cy - side / 2;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size);
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
