export const CHECK_STYLES = [
  { id: "check", label: "Check", glyph: "✓" },
  { id: "bold", label: "Bold", glyph: "✔" },
  { id: "box", label: "Box", glyph: "☑" },
  { id: "circle", label: "Circle", glyph: "⦿" },
  { id: "cross", label: "Cross", glyph: "✗" },
  { id: "double", label: "Double", glyph: "✔✔" },
] as const;

export type CheckStyle = (typeof CHECK_STYLES)[number]["id"];

const STYLE_IDS = new Set<string>(CHECK_STYLES.map((s) => s.id));

export function normalizeCheckStyle(value: string | null | undefined): CheckStyle | null {
  if (!value) return null;
  if (value === "✓" || value === "✔" || value === "true" || value === "checked" || value === "checkmark") return "check";
  if (value === "✗" || value === "✕" || value === "x" || value === "X") return "cross";
  if (value === "☑") return "box";
  if (STYLE_IDS.has(value)) return value as CheckStyle;
  return null;
}

/** A placed style preference is not yet a completed check. */
export function checkAppearance(value: string | null | undefined): { filled: boolean; style: CheckStyle } {
  if (value?.startsWith("style:")) {
    return { filled: false, style: normalizeCheckStyle(value.slice(6)) || "check" };
  }
  const style = normalizeCheckStyle(value);
  if (style) return { filled: true, style };
  return { filled: false, style: "check" };
}

export function checkGlyph(style: CheckStyle): string {
  return CHECK_STYLES.find((s) => s.id === style)?.glyph || "✓";
}
