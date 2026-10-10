import { decodeFieldValue } from "@/lib/fieldStyle";
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
  if (!label) return null;
  const raw = label.trim();
  const exact = COMPANY_SEALS.find((s) => s.stampLabel === raw || s.id === raw);
  if (exact) return exact;
  return COMPANY_SEALS.find((s) => raw.includes(s.stampLabel)) || null;
}

export function sealFromField(field: { field_type?: string | null; value?: string | null }) {
  return sealByStampLabel(field.value) || sealByStampLabel(decodeFieldValue(field.value).text);
}

export function isSealField(field: { field_type?: string | null; value?: string | null }) {
  return field.field_type === "seal" || !!sealFromField(field);
}

/** Concentric layout: logo disk inset from its ring, name band, gold ring, outer rim. */
const CX = 160;
const CY = 160;
const LOGO_RING_R = 78;
const LOGO_RING_SW = 3;
const LOGO_CLEARANCE = 3.5;
const LOGO_R = LOGO_RING_R - LOGO_RING_SW / 2 - LOGO_CLEARANCE;
const NAME_R = 106;
const HAIRLINE_R = 132;
const GOLD_R = 144;
const OUTER_R = 156;

function logoImage(logo: string | null | undefined) {
  if (!logo) return "";
  const href = logo.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const box = LOGO_R * 2;
  return `<defs><clipPath id="seal-logo-clip"><circle cx="${CX}" cy="${CY}" r="${LOGO_R}"/></clipPath></defs>
  <circle cx="${CX}" cy="${CY}" r="${LOGO_R}" fill="#06147a"/>
  <g clip-path="url(#seal-logo-clip)">
    <image href="${href}" x="${CX - LOGO_R}" y="${CY - LOGO_R}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid slice"/>
  </g>`;
}

function ringText(text: string, pathId: string, fill: string, size: number, tracking: number) {
  return `<text fill="${fill}" font-family="Georgia, 'Times New Roman', Times, serif" font-size="${size}" font-weight="700" letter-spacing="${tracking}"><textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${text}</textPath></text>`;
}

function frame(ink: string, gold: string, paper: string) {
  return `<circle cx="${CX}" cy="${CY}" r="${OUTER_R}" fill="${paper}" stroke="${ink}" stroke-width="3.5"/>
  <circle cx="${CX}" cy="${CY}" r="${GOLD_R}" fill="none" stroke="${gold}" stroke-width="7"/>
  <circle cx="${CX}" cy="${CY}" r="${HAIRLINE_R}" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
}

function logoRing(gold: string) {
  return `<circle cx="${CX}" cy="${CY}" r="${LOGO_RING_R}" fill="none" stroke="${gold}" stroke-width="${LOGO_RING_SW}"/>`;
}

function namePaths() {
  const r = NAME_R;
  return `<path id="seal-name-top" fill="none" d="M ${CX - r},${CY} a ${r},${r} 0 0,1 ${r * 2},0"/>
  <path id="seal-name-bot" fill="none" d="M ${CX + r},${CY} a ${r},${r} 0 0,1 ${-r * 2},0"/>`;
}

export function companySealSvg(id: CompanySealId, logo: string | null = getActiveSealLogo()): string {
  const mark = logoImage(logo);
  const shortName = id === "efinmoney";
  const ink = shortName ? "#0f3d2e" : "#1c2c4a";
  const gold = shortName ? "#c6a15b" : "#b08d3e";
  const paper = shortName ? "#f8faf6" : "#f7f5f0";
  const company = shortName ? "EFINMONEY" : "EFINTAX ADVISORS LTD";
  const nameSize = shortName ? 20 : 14.5;
  const nameTrack = shortName ? 2.4 : 0.45;

  const center = mark || (shortName
    ? `<circle cx="${CX}" cy="${CY}" r="${LOGO_R}" fill="${ink}"/>
  <text x="${CX}" y="152" text-anchor="middle" fill="#f8f3e6" font-family="Georgia, serif" font-size="36" font-weight="700">eF</text>
  <text x="${CX}" y="176" text-anchor="middle" fill="${gold}" font-family="Georgia, serif" font-size="11" letter-spacing="2.2">MONEY</text>`
    : `<circle cx="${CX}" cy="${CY}" r="${LOGO_R}" fill="${ink}"/>
  <text x="${CX}" y="168" text-anchor="middle" fill="#f3e6c4" font-family="Georgia, serif" font-size="28" font-weight="700">ETA</text>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    ${namePaths()}
  </defs>
  ${frame(ink, gold, paper)}
  ${center}
  ${logoRing(gold)}
  ${ringText(company, "seal-name-top", ink, nameSize, nameTrack)}
  ${ringText("CORPORATE SEAL", "seal-name-bot", ink, 13, 1.6)}
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
