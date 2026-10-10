import type { CheckStyle } from "@/lib/checkStyles";
import type { EditorFont } from "@/lib/editorFonts";
import type { TextAlign } from "@/lib/textLayout";

export type { TextAlign, EditorFont };

export type { CheckStyle };
export type ToolMode =
  | "select"
  | "text"
  | "draw"
  | "stamp"
  | "checkmark"
  | "highlight"
  | "shape"
  | "image"
  | "whiteout"
  | "signature"
  | "sticky"
  | "comment";

export type ShapeType = "rect" | "rounded" | "circle" | "ellipse" | "line" | "triangle" | "diamond" | "arrow";

export type ListStyle = "none" | "bullet" | "number";

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
  backgroundColor?: string;
  fontFamily?: EditorFont;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  lineHeight?: number;
  listStyle?: ListStyle;
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

export interface DrawingAnnotation extends BaseAnnotation {
  type: "drawing";
  width: number;
  height: number;
  imageData: string;
  rotate?: number;
  color?: string;
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
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: EditorFont;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  align?: TextAlign;
  lineHeight?: number;
  listStyle?: ListStyle;
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
  color?: string;
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: "signature";
  width: number;
  height: number;
  imageData?: string;
}

export interface StickyNoteAnnotation extends BaseAnnotation {
  type: "sticky";
  width: number;
  height: number;
  text: string;
  color?: string;
}

export interface CommentAnnotation extends BaseAnnotation {
  type: "comment";
  text: string;
  author: string;
  color: string;
  resolved?: boolean;
  createdAt: string;
}

export type Annotation =
  | TextAnnotation
  | StampAnnotation
  | DrawingAnnotation
  | CheckmarkAnnotation
  | HighlightAnnotation
  | ShapeAnnotation
  | ImageAnnotation
  | WhiteoutAnnotation
  | SignatureAnnotation
  | StickyNoteAnnotation
  | CommentAnnotation;

export interface PageState {
  pageNum: number;
  deleted: boolean;
}

export function genId(): string {
  return crypto.randomUUID();
}
