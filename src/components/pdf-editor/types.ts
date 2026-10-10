import type { CheckStyle } from "@/lib/checkStyles";
import type { TextAlign } from "@/lib/textLayout";

export type { TextAlign };

export type { CheckStyle };
export type ToolMode = "select" | "text" | "draw" | "stamp" | "checkmark" | "highlight" | "shape" | "image" | "whiteout";

export type ShapeType = "rect" | "circle" | "line";

export type EditorFont = "helvetica" | "times" | "courier";

interface BaseAnnotation {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: "text";
  text: string;
  fontSize: number;
  /** Box width in canvas pixels. Text wraps inside it so it does not run over nearby content. */
  width?: number;
  height?: number;
  color?: string;
  fontFamily?: EditorFont;
  bold?: boolean;
  opacity?: number;
  rotate?: number;
  align?: TextAlign;
}

export interface StampAnnotation extends BaseAnnotation {
  type: "stamp";
  label: string;
  width?: number;
  height?: number;
}

export interface DrawingAnnotation {
  type: "drawing";
  id: string;
  pageIndex: number;
  imageData: string;
}

export interface CheckmarkAnnotation extends BaseAnnotation {
  type: "checkmark";
  size: number;
  style?: CheckStyle;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: "highlight";
  width: number;
  height: number;
  color: string;
  opacity: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: "shape";
  width: number;
  height: number;
  shapeType: ShapeType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: "image";
  width: number;
  height: number;
  imageData: string;
}

export interface WhiteoutAnnotation extends BaseAnnotation {
  type: "whiteout";
  width: number;
  height: number;
}

export type Annotation =
  | TextAnnotation
  | StampAnnotation
  | DrawingAnnotation
  | CheckmarkAnnotation
  | HighlightAnnotation
  | ShapeAnnotation
  | ImageAnnotation
  | WhiteoutAnnotation;

export interface PageState {
  pageNum: number;
  deleted: boolean;
}

export function genId(): string {
  return crypto.randomUUID();
}
