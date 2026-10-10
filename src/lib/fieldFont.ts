/** Screen font size for a field box. Grows with the box so A+ can enlarge the text. */
export function fontSizeForFieldHeight(height: number): number {
  const h = Number.isFinite(height) ? height : 30;
  return Math.min(36, Math.max(14, Math.round(h * 0.5)));
}

/** PDF point size matching the on-screen size (viewer scale is 1.5). */
export function pdfFontSizeForField(pdfHeight: number): number {
  return Math.min(24, Math.max(8, pdfHeight * 0.5));
}

/** Change the box height so the derived font size moves by about 2px. */
export function stepFieldHeight(height: number, direction: 1 | -1): number {
  const current = fontSizeForFieldHeight(height);
  const target = Math.min(36, Math.max(14, current + direction * 2));
  return Math.max(28, Math.round(target / 0.5));
}

export function isTextLikeField(fieldType?: string | null): boolean {
  return ["text", "full_name", "title", "date", "name", "email"].includes(fieldType || "");
}
