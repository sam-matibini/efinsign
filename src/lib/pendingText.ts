import type { ListStyle, TextAlign, TextAnnotation } from "@/components/pdf-editor/types";
import { genId } from "@/components/pdf-editor/types";
import { DEFAULT_TEXT_BOX_WIDTH, estimateWrappedHeight } from "@/lib/textWrap";

export function textAnnotationFromEditor(input: {
  id?: string;
  pageIndex: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  align?: TextAlign;
  text: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  fontFamily: TextAnnotation["fontFamily"];
  bold: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  lineHeight?: number;
  listStyle?: ListStyle;
}): TextAnnotation | null {
  const text = input.text.replace(/\s+$/, "").trim();
  if (!text) return null;
  const width = input.width || DEFAULT_TEXT_BOX_WIDTH;
  const height = input.height || estimateWrappedHeight(text, input.fontSize, width);
  return {
    type: "text",
    id: input.id || genId(),
    pageIndex: input.pageIndex,
    x: input.x,
    y: input.y,
    text,
    fontSize: input.fontSize,
    width,
    height,
    color: input.color,
    backgroundColor: input.backgroundColor && input.backgroundColor !== "none" ? input.backgroundColor : undefined,
    fontFamily: input.fontFamily,
    bold: input.bold,
    italic: input.italic,
    underline: input.underline,
    strikethrough: input.strikethrough,
    lineHeight: input.lineHeight,
    listStyle: input.listStyle,
    align: input.align ?? "left",
  };
}

export function withPendingText<T extends { id: string }>(annotations: T[], pending: T | null): T[] {
  if (!pending) return annotations;
  if (annotations.some((a) => a.id === pending.id)) {
    return annotations.map((a) => (a.id === pending.id ? pending : a));
  }
  return [...annotations, pending];
}

export function formatDisplayLines(text: string, listStyle?: ListStyle): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (listStyle === "bullet") return lines.map((line) => (line ? `• ${line}` : line));
  if (listStyle === "number") {
    let n = 0;
    return lines.map((line) => {
      if (!line) return line;
      n += 1;
      return `${n}. ${line}`;
    });
  }
  return lines;
}
