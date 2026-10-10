import { getActiveSealLogo } from "@/lib/orgSeal";

export const COMPANY_SEALS = [
  {
    id: "efinmoney",
    label: "eFinMoney",
    legalName: "eFinMoney",
    stampLabel: "seal:efinmoney",
  },
  {
    id: "efintax",
    label: "eFinTax Advisors Ltd",
    legalName: "eFinTax Advisors Ltd",
    stampLabel: "seal:efintax",
  },
] as const;

export type CompanySealId = (typeof COMPANY_SEALS)[number]["id"];

export function sealByStampLabel(label: string | null | undefined) {
  return COMPANY_SEALS.find((s) => s.stampLabel === label) || null;
}

function logoImage(logo: string | null | undefined) {
  if (!logo) return "";
  const href = logo.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<defs><clipPath id="seal-logo-clip"><circle cx="160" cy="160" r="80"/></clipPath></defs>
  <circle cx="160" cy="160" r="80" fill="#06147a"/>
  <image href="${href}" x="68" y="68" width="184" height="184" preserveAspectRatio="xMidYMid slice" clip-path="url(#seal-logo-clip)"/>`;
}

function ringText(text: string, pathId: string, fill: string, size: number, tracking = 0.8) {
  return `<text fill="${fill}" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="700" letter-spacing="${tracking}"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${text}</textPath></text>`;
}

export function companySealSvg(id: CompanySealId, logo: string | null = getActiveSealLogo()): string {
  const mark = logoImage(logo);
  if (id === "efinmoney") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <path id="em-top" d="M46,160 a114,114 0 0,1 228,0"/>
    <path id="em-bot" d="M78,168 a82,82 0 0,0 164,0"/>
  </defs>
  <circle cx="160" cy="160" r="154" fill="#f8faf6" stroke="#0f3d2e" stroke-width="4"/>
  <circle cx="160" cy="160" r="142" fill="none" stroke="#c6a15b" stroke-width="8"/>
  <circle cx="160" cy="160" r="128" fill="none" stroke="#0f3d2e" stroke-width="2"/>
  ${mark ? mark : `<circle cx="160" cy="160" r="78" fill="#0f3d2e"/>
  <circle cx="160" cy="160" r="70" fill="none" stroke="#c6a15b" stroke-width="2"/>
  <text x="160" y="156" text-anchor="middle" fill="#f8f3e6" font-family="Georgia, serif" font-size="34" font-weight="700">eF</text>
  <text x="160" y="178" text-anchor="middle" fill="#c6a15b" font-family="Georgia, serif" font-size="11" letter-spacing="2">MONEY</text>`}
  ${mark ? `<circle cx="160" cy="160" r="80" fill="none" stroke="#c6a15b" stroke-width="3"/>` : ""}
  ${ringText("EFINMONEY", "em-top", "#0f3d2e", 26, 1.2)}
  ${ringText("CORPORATE SEAL", "em-bot", "#0f3d2e", 16, 1)}
  <circle cx="160" cy="52" r="3" fill="#c6a15b"/>
  <circle cx="160" cy="268" r="3" fill="#c6a15b"/>
  <text x="160" y="208" text-anchor="middle" fill="#0f3d2e" font-family="Georgia, serif" font-size="8" letter-spacing="1.2">ELECTRONIC SEAL</text>
</svg>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <path id="et-top" d="M40,162 a120,120 0 0,1 240,0"/>
    <path id="et-bot" d="M72,170 a88,88 0 0,0 176,0"/>
  </defs>
  <circle cx="160" cy="160" r="154" fill="#f7f5f0" stroke="#1c2c4a" stroke-width="4"/>
  <circle cx="160" cy="160" r="142" fill="none" stroke="#b08d3e" stroke-width="8"/>
  <circle cx="160" cy="160" r="128" fill="none" stroke="#1c2c4a" stroke-width="2"/>
  ${mark ? mark : `<circle cx="160" cy="160" r="74" fill="#1c2c4a"/>
  <circle cx="160" cy="160" r="66" fill="none" stroke="#b08d3e" stroke-width="2"/>
  <path d="M160 112 l22 14 v28 c0 22-14 34-22 40 c-8-6-22-18-22-40 v-28 z" fill="none" stroke="#f3e6c4" stroke-width="2"/>
  <text x="160" y="164" text-anchor="middle" fill="#f3e6c4" font-family="Georgia, serif" font-size="26" font-weight="700">ETA</text>`}
  ${mark ? `<circle cx="160" cy="160" r="80" fill="none" stroke="#b08d3e" stroke-width="3"/>` : ""}
  ${ringText("EFINTAX ADVISORS LTD", "et-top", "#1c2c4a", 20, 0.35)}
  ${ringText("CORPORATE SEAL", "et-bot", "#1c2c4a", 16, 0.8)}
  <circle cx="46" cy="160" r="3" fill="#b08d3e"/>
  <circle cx="274" cy="160" r="3" fill="#b08d3e"/>
  <text x="160" y="214" text-anchor="middle" fill="#1c2c4a" font-family="Georgia, serif" font-size="8" letter-spacing="1">ELECTRONIC SEAL</text>
</svg>`;
}

export function companySealDataUrl(id: CompanySealId, logo: string | null = getActiveSealLogo()): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(companySealSvg(id, logo))}`;
}

export function svgToPngBytes(svg: string, size = 512): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not draw the company seal"));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      const data = canvas.toDataURL("image/png");
      const b64 = data.split(",")[1] || "";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      resolve(bytes);
    };
    img.onerror = () => reject(new Error("Could not draw the company seal"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
