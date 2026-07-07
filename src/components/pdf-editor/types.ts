export type ToolMode = "select" | "text" | "draw" | "stamp" | "checkmark" | "highlight" | "shape" | "image";

export type ShapeType = "rect" | "circle" | "line";

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
}

export interface StampAnnotation extends BaseAnnotation {
  type: "stamp";
  label: string;
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

export type Annotation =
  | TextAnnotation
  | StampAnnotation
  | DrawingAnnotation
  | CheckmarkAnnotation
  | HighlightAnnotation
  | ShapeAnnotation
  | ImageAnnotation;

export interface PageState {
  pageNum: number;
  deleted: boolean;
}

export function genId(): string {
  return crypto.randomUUID();
}
