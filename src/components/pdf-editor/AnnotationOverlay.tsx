import { useCallback, useRef, useState } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Annotation, ToolMode, TextAnnotation, StampAnnotation, CheckmarkAnnotation, HighlightAnnotation, ShapeAnnotation, ImageAnnotation } from "./types";

type ResizeDir = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

const HANDLE_SIZE = 8;
const MIN_SIZE = 20;

const CURSOR_MAP: Record<ResizeDir, string> = {
  nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize",
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
};

function hasSize(ann: Annotation): ann is HighlightAnnotation | ShapeAnnotation | ImageAnnotation {
  return ann.type === "highlight" || ann.type === "shape" || ann.type === "image";
}

interface AnnotationOverlayProps {
  annotations: Annotation[];
  pageIndex: number;
  tool: ToolMode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
}

export default function AnnotationOverlay({
  annotations, pageIndex, tool, selectedId, onSelect, onDelete, onUpdate,
}: AnnotationOverlayProps) {
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex && a.type !== "drawing");
  const isSelectMode = tool === "select";
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{
    id: string; dir: ResizeDir; startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent, ann: Annotation) => {
    if (!isSelectMode) return;
    e.stopPropagation();
    onSelect(ann.id);
    if ("x" in ann && "y" in ann) {
      dragRef.current = { id: ann.id, startX: e.clientX, startY: e.clientY, origX: ann.x, origY: ann.y };
      setDragging(true);
    }
  }, [isSelectMode, onSelect]);

  const handleResizeDown = useCallback((e: React.MouseEvent, ann: Annotation, dir: ResizeDir) => {
    if (!isSelectMode || !hasSize(ann)) return;
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = {
      id: ann.id, dir, startX: e.clientX, startY: e.clientY,
      origX: ann.x, origY: ann.y, origW: ann.width, origH: ann.height,
    };
    setResizing(true);
  }, [isSelectMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (resizing && resizeRef.current) {
      const r = resizeRef.current;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      let { origX: x, origY: y, origW: w, origH: h } = r;

      if (r.dir.includes("e")) w = Math.max(MIN_SIZE, w + dx);
      if (r.dir.includes("w")) { w = Math.max(MIN_SIZE, w - dx); x = r.origX + (r.origW - w); }
      if (r.dir.includes("s")) h = Math.max(MIN_SIZE, h + dy);
      if (r.dir.includes("n")) { h = Math.max(MIN_SIZE, h - dy); y = r.origY + (r.origH - h); }

      onUpdate(r.id, { x, y, width: w, height: h } as any);
      return;
    }
    if (dragging && dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      onUpdate(dragRef.current.id, { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy } as any);
    }
  }, [dragging, resizing, onUpdate]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
    setDragging(false);
    setResizing(false);
  }, []);

  const renderResizeHandles = (ann: Annotation) => {
    if (!hasSize(ann)) return null;
    const { width: w, height: h } = ann;
    const half = HANDLE_SIZE / 2;
    const positions: { dir: ResizeDir; left: number; top: number }[] = [
      { dir: "nw", left: -half, top: -half },
      { dir: "ne", left: w - half, top: -half },
      { dir: "sw", left: -half, top: h - half },
      { dir: "se", left: w - half, top: h - half },
      { dir: "n", left: w / 2 - half, top: -half },
      { dir: "s", left: w / 2 - half, top: h - half },
      { dir: "w", left: -half, top: h / 2 - half },
      { dir: "e", left: w - half, top: h / 2 - half },
    ];
    return positions.map(({ dir, left, top }) => (
      <div
        key={dir}
        className="absolute bg-primary border border-primary-foreground z-30"
        style={{
          left, top, width: HANDLE_SIZE, height: HANDLE_SIZE,
          cursor: CURSOR_MAP[dir], pointerEvents: "auto",
        }}
        onMouseDown={(e) => handleResizeDown(e, ann, dir)}
      />
    ));
  };

  return (
    <div
      className="absolute inset-0"
      style={{ pointerEvents: isSelectMode ? "auto" : "none" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => { if (isSelectMode) { e.stopPropagation(); onSelect(null); } }}
    >
      {pageAnnotations.map((ann) => {
        const isSelected = selectedId === ann.id;
        const common = {
          position: "absolute" as const,
          left: "x" in ann ? ann.x : 0,
          top: "y" in ann ? ann.y : 0,
          pointerEvents: isSelectMode ? "auto" as const : "none" as const,
          cursor: isSelectMode ? "move" : "default",
          outline: isSelected ? "2px dashed hsl(var(--primary))" : "none",
          outlineOffset: 2,
        };

        return (
          <div key={ann.id} style={common} onMouseDown={(e) => handleMouseDown(e, ann)} onClick={(e) => e.stopPropagation()}>
            {/* Delete toolbar */}
            {isSelected && (
              <div className="absolute -top-8 left-0 flex gap-1 z-20">
                <Button size="sm" variant="destructive" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
                <div className="h-6 w-6 flex items-center justify-center bg-muted rounded cursor-grab">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Resize handles */}
            {isSelected && renderResizeHandles(ann)}

            {/* Render by type */}
            {ann.type === "text" && (
              <span style={{ fontSize: (ann as TextAnnotation).fontSize }} className="text-foreground whitespace-nowrap select-none">
                {(ann as TextAnnotation).text}
              </span>
            )}
            {ann.type === "stamp" && (
              <span className="font-bold text-3xl text-destructive/40 uppercase select-none" style={{ transform: "rotate(-30deg)", display: "inline-block" }}>
                {(ann as StampAnnotation).label}
              </span>
            )}
            {ann.type === "checkmark" && (
              <span style={{ fontSize: (ann as CheckmarkAnnotation).size }} className="text-green-600 font-bold select-none">✓</span>
            )}
            {ann.type === "highlight" && (
              <div
                style={{
                  width: (ann as HighlightAnnotation).width,
                  height: (ann as HighlightAnnotation).height,
                  backgroundColor: (ann as HighlightAnnotation).color,
                  opacity: (ann as HighlightAnnotation).opacity,
                  borderRadius: 2,
                }}
              />
            )}
            {ann.type === "shape" && renderShape(ann as ShapeAnnotation)}
            {ann.type === "image" && (
              <img
                src={(ann as ImageAnnotation).imageData}
                style={{ width: (ann as ImageAnnotation).width, height: (ann as ImageAnnotation).height }}
                className="select-none"
                draggable={false}
                alt="annotation"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderShape(ann: ShapeAnnotation) {
  const { width, height, shapeType, strokeColor, fillColor, strokeWidth: sw } = ann;
  const fill = fillColor === "none" ? "transparent" : fillColor;

  if (shapeType === "rect") {
    return (
      <svg width={width} height={height} className="select-none">
        <rect x={sw / 2} y={sw / 2} width={Math.max(0, width - sw)} height={Math.max(0, height - sw)} stroke={strokeColor} fill={fill} strokeWidth={sw} />
      </svg>
    );
  }
  if (shapeType === "circle") {
    return (
      <svg width={width} height={height} className="select-none">
        <ellipse cx={width / 2} cy={height / 2} rx={Math.max(0, width / 2 - sw / 2)} ry={Math.max(0, height / 2 - sw / 2)} stroke={strokeColor} fill={fill} strokeWidth={sw} />
      </svg>
    );
  }
  return (
    <svg width={width} height={height} className="select-none">
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={strokeColor} strokeWidth={sw} />
    </svg>
  );
}
