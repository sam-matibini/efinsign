import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clampRect, defaultTextBoxHeight, DEFAULT_TEXT_BOX_WIDTH, snapRect, type Rect } from "@/lib/textLayout";
import type { Annotation, ToolMode, TextAnnotation, StampAnnotation, CheckmarkAnnotation, HighlightAnnotation, ShapeAnnotation, ImageAnnotation } from "./types";
import { MIN_SIZE, renderResizeHandles, type ResizeDir } from "./resizeHandles";

function hasSize(ann: Annotation): ann is HighlightAnnotation | ShapeAnnotation | ImageAnnotation | TextAnnotation {
  return ann.type === "highlight" || ann.type === "shape" || ann.type === "image" || ann.type === "text";
}

export function annotationBox(ann: Annotation): Rect | null {
  if (ann.type === "drawing") return null;
  if (ann.type === "text") {
    return {
      x: ann.x,
      y: ann.y,
      w: ann.width ?? DEFAULT_TEXT_BOX_WIDTH,
      h: ann.height ?? defaultTextBoxHeight(ann.fontSize),
    };
  }
  if (ann.type === "highlight" || ann.type === "shape" || ann.type === "image") {
    return { x: ann.x, y: ann.y, w: ann.width, h: ann.height };
  }
  if (ann.type === "checkmark") {
    return { x: ann.x, y: ann.y, w: ann.size, h: ann.size };
  }
  if (ann.type === "stamp") {
    return { x: ann.x, y: ann.y, w: 120, h: 40 };
  }
  return null;
}

interface AnnotationOverlayProps {
  annotations: Annotation[];
  pageIndex: number;
  tool: ToolMode;
  selectedId: string | null;
  hiddenId?: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onEditText?: (ann: TextAnnotation) => void;
}

export default function AnnotationOverlay({
  annotations, pageIndex, tool, selectedId, hiddenId, onSelect, onDelete, onUpdate, onEditText,
}: AnnotationOverlayProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex && a.type !== "drawing" && a.id !== hiddenId);
  const isSelectMode = tool === "select" || tool === "text";
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; w: number; h: number } | null>(null);
  const resizeRef = useRef<{
    id: string; dir: ResizeDir; startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [guides, setGuides] = useState<{ v: number | null; h: number | null }>({ v: null, h: null });

  const pageSize = () => {
    const el = pageRef.current;
    return { w: el?.clientWidth || 0, h: el?.clientHeight || 0 };
  };

  const othersFor = (id: string): Rect[] =>
    pageAnnotations.filter((a) => a.id !== id).map(annotationBox).filter((r): r is Rect => r !== null);

  const handleMouseDown = useCallback((e: React.MouseEvent, ann: Annotation) => {
    if (!isSelectMode) return;
    e.stopPropagation();
    onSelect(ann.id);
    const box = annotationBox(ann);
    if (!box) return;
    dragRef.current = { id: ann.id, startX: e.clientX, startY: e.clientY, origX: box.x, origY: box.y, w: box.w, h: box.h };
    setDragging(true);
  }, [isSelectMode, onSelect]);

  const handleResizeDown = useCallback((e: React.MouseEvent, ann: Annotation, dir: ResizeDir) => {
    if (!isSelectMode || !hasSize(ann)) return;
    e.stopPropagation();
    e.preventDefault();
    const box = annotationBox(ann)!;
    resizeRef.current = {
      id: ann.id, dir, startX: e.clientX, startY: e.clientY,
      origX: box.x, origY: box.y, origW: box.w, origH: box.h,
    };
    setResizing(true);
  }, [isSelectMode]);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const move = (e: MouseEvent) => {
      const { w: pageW, h: pageH } = pageSize();
      if (resizing && resizeRef.current) {
        const r = resizeRef.current;
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        let x = r.origX, y = r.origY, w = r.origW, h = r.origH;
        if (r.dir.includes("e")) w = Math.max(MIN_SIZE, w + dx);
        if (r.dir.includes("w")) { w = Math.max(MIN_SIZE, w - dx); x = r.origX + (r.origW - w); }
        if (r.dir.includes("s")) h = Math.max(MIN_SIZE, h + dy);
        if (r.dir.includes("n")) { h = Math.max(MIN_SIZE, h - dy); y = r.origY + (r.origH - h); }
        const clamped = clampRect({ x, y, w, h }, pageW, pageH);
        onUpdate(r.id, { x: clamped.x, y: clamped.y, width: clamped.w, height: clamped.h } as Partial<Annotation>);
        return;
      }
      if (dragging && dragRef.current) {
        const d = dragRef.current;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        const snapped = snapRect(
          { x: d.origX + dx, y: d.origY + dy, w: d.w, h: d.h },
          othersFor(d.id),
          pageW,
          pageH,
        );
        const clamped = clampRect({ x: snapped.x, y: snapped.y, w: d.w, h: d.h }, pageW, pageH);
        setGuides({ v: snapped.guideV, h: snapped.guideH });
        onUpdate(d.id, { x: clamped.x, y: clamped.y } as Partial<Annotation>);
      }
    };

    const up = () => {
      dragRef.current = null;
      resizeRef.current = null;
      setDragging(false);
      setResizing(false);
      setGuides({ v: null, h: null });
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    // othersFor is derived from pageAnnotations
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, resizing, onUpdate, pageAnnotations]);

  return (
    <div
      ref={pageRef}
      className="absolute inset-0 z-[15]"
      style={{ pointerEvents: tool === "select" ? "auto" : "none" }}
      onClick={(e) => { if (tool === "select") { e.stopPropagation(); onSelect(null); } }}
    >
      {guides.v !== null && (
        <div className="absolute top-0 bottom-0 w-px bg-primary z-40 pointer-events-none" style={{ left: guides.v }} />
      )}
      {guides.h !== null && (
        <div className="absolute left-0 right-0 h-px bg-primary z-40 pointer-events-none" style={{ top: guides.h }} />
      )}
      {pageAnnotations.map((ann) => {
        const isSelected = selectedId === ann.id;
        const box = annotationBox(ann);
        const common = {
          position: "absolute" as const,
          left: box?.x ?? 0,
          top: box?.y ?? 0,
          width: hasSize(ann) ? box?.w : undefined,
          height: hasSize(ann) ? box?.h : undefined,
          pointerEvents: isSelectMode ? "auto" as const : "none" as const,
          cursor: isSelectMode ? "move" : "default",
          outline: isSelected ? "2px dashed hsl(var(--primary))" : ann.type === "text" ? "1px dashed hsl(var(--border))" : "none",
          outlineOffset: 2,
        };

        return (
          <div
            key={ann.id}
            style={common}
            onMouseDown={(e) => handleMouseDown(e, ann)}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (ann.type === "text") onEditText?.(ann);
            }}
          >
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

            {isSelected && box && renderResizeHandles(box.w, box.h, (e, dir) => handleResizeDown(e, ann, dir))}

            {ann.type === "text" && (
              <div
                className="text-foreground select-none whitespace-pre-wrap break-words overflow-hidden h-full w-full px-0.5"
                style={{
                  fontSize: (ann as TextAnnotation).fontSize,
                  lineHeight: 1.25,
                  textAlign: (ann as TextAnnotation).align ?? "left",
                }}
              >
                {(ann as TextAnnotation).text}
              </div>
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
