import type { EditorFont } from "@/lib/editorFonts";
import type { TextAlign } from "@/lib/textLayout";

export interface FieldStyle {
  fontFamily?: EditorFont;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  backgroundColor?: string;
  align?: TextAlign;
  lineHeight?: number;
}

const MARKER = "\u241eefin1:";

export function encodeFieldValue(text: string, style?: FieldStyle | null): string {
  const clean = (text || "").replace(/\s+$/, "");
  if (!style || !Object.values(style).some((v) => v !== undefined && v !== false && v !== "none" && v !== "")) {
    return clean;
  }
  return `${MARKER}${JSON.stringify(style)}\n${clean}`;
}

export function decodeFieldValue(value: string | null | undefined): { text: string; style: FieldStyle } {
  if (!value) return { text: "", style: {} };
  if (!value.startsWith(MARKER)) return { text: value, style: {} };
  const nl = value.indexOf("\n");
  if (nl < 0) return { text: value, style: {} };
  try {
    const style = JSON.parse(value.slice(MARKER.length, nl)) as FieldStyle;
    return { text: value.slice(nl + 1), style: style && typeof style === "object" ? style : {} };
  } catch {
    return { text: value, style: {} };
  }
}

export const EMPTY_FIELD_STYLE: FieldStyle = {
  fontFamily: "helvetica",
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  color: "#111827",
  backgroundColor: "none",
  align: "left",
  lineHeight: 1.15,
};
