export type PdfStandardFamily = "helvetica" | "times" | "courier";

export type EditorFont =
  | "helvetica"
  | "arial"
  | "calibri"
  | "verdana"
  | "trebuchet"
  | "tahoma"
  | "times"
  | "georgia"
  | "garamond"
  | "cambria"
  | "palatino"
  | "courier"
  | "consolas";

export const EDITOR_FONTS: { id: EditorFont; label: string; css: string; pdf: PdfStandardFamily }[] = [
  { id: "calibri", label: "Calibri", css: "Calibri, Carlito, 'Segoe UI', sans-serif", pdf: "helvetica" },
  { id: "arial", label: "Arial", css: "Arial, Helvetica, sans-serif", pdf: "helvetica" },
  { id: "helvetica", label: "Helvetica", css: "Helvetica, Arial, sans-serif", pdf: "helvetica" },
  { id: "verdana", label: "Verdana", css: "Verdana, Geneva, sans-serif", pdf: "helvetica" },
  { id: "trebuchet", label: "Trebuchet MS", css: "'Trebuchet MS', Tahoma, sans-serif", pdf: "helvetica" },
  { id: "tahoma", label: "Tahoma", css: "Tahoma, Geneva, sans-serif", pdf: "helvetica" },
  { id: "times", label: "Times New Roman", css: "'Times New Roman', Times, serif", pdf: "times" },
  { id: "georgia", label: "Georgia", css: "Georgia, 'Times New Roman', serif", pdf: "times" },
  { id: "garamond", label: "Garamond", css: "Garamond, 'Times New Roman', serif", pdf: "times" },
  { id: "cambria", label: "Cambria", css: "Cambria, Georgia, serif", pdf: "times" },
  { id: "palatino", label: "Palatino", css: "Palatino, 'Palatino Linotype', serif", pdf: "times" },
  { id: "courier", label: "Courier New", css: "'Courier New', Courier, monospace", pdf: "courier" },
  { id: "consolas", label: "Consolas", css: "Consolas, 'Courier New', monospace", pdf: "courier" },
];

export function editorFontCss(family?: string): string {
  return EDITOR_FONTS.find((f) => f.id === family)?.css ?? "Helvetica, Arial, sans-serif";
}

export function editorFontPdf(family?: string): PdfStandardFamily {
  return EDITOR_FONTS.find((f) => f.id === family)?.pdf ?? "helvetica";
}

export const TEXT_COLOR_PRESETS = [
  { label: "Black", value: "#111827" },
  { label: "Navy", value: "#1e3a5f" },
  { label: "Red", value: "#b91c1c" },
  { label: "Green", value: "#166534" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Purple", value: "#6b21a8" },
];

export const HIGHLIGHT_BG_PRESETS = [
  { label: "None", value: "none" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Cyan", value: "#a5f3fc" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
];

export const LINE_SPACING = [
  { label: "1.0", value: 1 },
  { label: "1.15", value: 1.15 },
  { label: "1.5", value: 1.5 },
  { label: "2.0", value: 2 },
];
