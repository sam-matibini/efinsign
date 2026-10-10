import { useCallback, useRef, useState } from "react";
import { Trash2, GripVertical, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clampRect, snapRect } from "@/lib/textLayout";
import { DEFAULT_TEXT_BOX_WIDTH, estimateWrappedHeight } from "@/lib/textWrap";
import { checkGlyph } from "@/lib/checkStyles";
import { companySealDataUrl, sealByStampLabel } from "@/lib/companySeals";
import { editorFontCss } from "@/lib/editorFonts";
import { formatDisplayLines } from "@/lib/pendingText";
import { coverFinish } from "@/lib/editorMarks";
import type { Annotation, ToolMode, TextAnnotation, StampAnnotation, CheckmarkAnnotation, HighlightAnnotation, ShapeAnnotation, ImageAnnotation, WhiteoutAnnotation, SignatureAnnotation, StickyNoteAnnotation, DrawingAnnotation, CommentAnnotation } from "./types";
import { commentNumber } from "@/lib/editorReview";

type ResizeDir = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

const HANDLE_SIZE = 8;
const MIN_SIZE = 20;

const CURSOR_MAP: Record<ResizeDir, string> = {
  nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize",
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
};

function textBox(ann: TextAnnotation) {
  const width = ann.width && ann.width > 0 ? ann.width : DEFAULT_TEXT_BOX_WIDTH;
  const height = ann.height && ann.height > 0 ? ann.height : estimateWrappedHeight(ann.text, ann.fontSize, width);
  return { width, height };
}

function boxSize(ann: Annotation): { width: number; height: number } | null {
  if (ann.type === "text") return textBox(ann);
  if (ann.type === "stamp" && ann.width && ann.height) return { width: ann.width, height: ann.height };
  if (
    ann.type === "highlight" || ann.type === "shape" || ann.type === "image" ||
    ann.type === "whiteout" || ann.type === "signature" || ann.type === "sticky" ||
    ann.type === "drawing"
  ) {
    return { width: ann.width, height: ann.height };
  }
  if (ann.type === "comment") return { width: 28, height: 28 };
  return null;
}

export const PAGE_DRAW_TOOLS = ["highlight", "whiteout", "shape", "draw"] as const;

function isPageDrawTool(tool: ToolMode) {
  return (PAGE_DRAW_TOOLS as readonly string[]).includes(tool);
}

function isAlwaysInteractive(ann: Annotation) {
  return ann.type === "text" || ann.type === "signature" || ann.type === "sticky" || ann.type === "stamp" || ann.type === "drawing" || ann.type === "whiteout" || ann.type === "shape" || ann.type === "comment";
}

interface AnnotationOverlayProps {
  annotations: Annotation[];
  pageIndex: number;
  tool: ToolMode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onEditText?: (ann: TextAnnotation) => void;
  onEditSignature?: (ann: SignatureAnnotation) => void;
  onEditSticky?: (ann: StickyNoteAnnotation) => void;
  onEditShape?: (ann: ShapeAnnotation) => void;
  onEditComment?: (ann: CommentAnnotation) => void;
}

export default function AnnotationOverlay({
  annotations, pageIndex, tool, selectedId, onSelect, onDelete, onUpdate, onEditText, onEditSignature, onEditSticky, onEditShape, onEditComment,
}: AnnotationOverlayProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const pageAnnotations = annotations.filter((a) => a.pageIndex === pageIndex);
  const isSelectMode = tool === "select";
  const drawingOverPage = isPageDrawTool(tool);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; w: number; h: number } | null>(null);
  const [guides, setGuides] = useState<{ v: number | null; h: number | null }>({ v: null, h: null });
  const resizeRef = useRef<{
    id: string; dir: ResizeDir; startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const rotateRef = useRef<{ id: string; cx: number; cy: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, ann: Annotation) => {
    if (!isSelectMode && !isAlwaysInteractive(ann)) return;
    e.stopPropagation();
    onSelect(ann.id);
    if ("x" in ann && "y" in ann) {
      const box = boxSize(ann);
      dragRef.current = {
        id: ann.id, startX: e.clientX, startY: e.clientY, origX: ann.x, origY: ann.y,
        w: box?.width ?? 40, h: box?.height ?? 24,
      };
      setDragging(true);
    }
  }, [isSelectMode, onSelect]);

  const handleResizeDown = useCallback((e: React.MouseEvent, ann: Annotation, dir: ResizeDir) => {
    const box = boxSize(ann);
    if (!box || !("x" in ann)) return;
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = {
      id: ann.id, dir, startX: e.clientX, startY: e.clientY,
      origX: ann.x, origY: ann.y, origW: box.width, origH: box.height,
    };
    setResizing(true);
  }, [isSelectMode]);

  const handleRotateDown = useCallback((e: React.MouseEvent, ann: Annotation) => {
    const box = boxSize(ann);
    if (!box || !("x" in ann)) return;
    e.stopPropagation();
    e.preventDefault();
    const page = pageRef.current?.getBoundingClientRect();
    if (!page) return;
    const cx = page.left + ann.x + box.width / 2;
    const cy = page.top + ann.y + box.height / 2;
    rotateRef.current = { id: ann.id, cx, cy };
    const move = (ev: MouseEvent) => {
      const deg = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90 + 360) % 360;
      onUpdate(ann.id, { rotate: Math.round(deg) } as any);
    };
    const up = () => {
      rotateRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [onUpdate]);

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
      const d = dragRef.current;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const pageW = pageRef.current?.clientWidth || 0;
      const pageH = pageRef.current?.clientHeight || 0;
      const others = pageAnnotations
        .filter((a) => a.id !== d.id)
        .flatMap((a) => {
          if (!("x" in a) || !("y" in a)) return [];
          const box = boxSize(a);
          return [{ x: a.x, y: a.y, w: box?.width ?? 40, h: box?.height ?? 24 }];
        });
      const snapped = snapRect({ x: d.origX + dx, y: d.origY + dy, w: d.w, h: d.h }, others, pageW, pageH);
      const clamped = clampRect({ x: snapped.x, y: snapped.y, w: d.w, h: d.h }, pageW || 4000, pageH || 4000);
      setGuides({ v: snapped.guideV, h: snapped.guideH });
      onUpdate(d.id, { x: clamped.x, y: clamped.y } as any);
    }
  }, [dragging, resizing, onUpdate, pageAnnotations]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
    rotateRef.current = null;
    setDragging(false);
    setResizing(false);
    setGuides({ v: null, h: null });
  }, []);

  const renderResizeHandles = (ann: Annotation) => {
    const box = boxSize(ann);
    if (!box) return null;
    const { width: w, height: h } = box;
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
      ref={pageRef}
      className="absolute inset-0"
      style={{ pointerEvents: drawingOverPage ? "none" : isSelectMode ? "auto" : "none" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => { if (isSelectMode) { e.stopPropagation(); onSelect(null); } }}
    >
      {guides.v !== null && (
        <div className="absolute top-0 bottom-0 w-px bg-primary z-40 pointer-events-none" style={{ left: guides.v }} />
      )}
      {guides.h !== null && (
        <div className="absolute left-0 right-0 h-px bg-primary z-40 pointer-events-none" style={{ top: guides.h }} />
      )}
      {pageAnnotations.map((ann) => {
        const isSelected = selectedId === ann.id;
        const box = boxSize(ann);
        const interactive = drawingOverPage
          ? ann.type === "drawing" || ann.type === "whiteout" || ann.type === "shape"
          : (isSelectMode || isAlwaysInteractive(ann));
        const common = {
          position: "absolute" as const,
          left: "x" in ann ? ann.x : 0,
          top: "y" in ann ? ann.y : 0,
          width: box?.width,
          height: box?.height,
          pointerEvents: interactive ? "auto" as const : "none" as const,
          cursor: interactive ? "move" : "default",
          outline: isSelected ? "2px dashed hsl(var(--primary))" : "none",
          outlineOffset: 2,
          transform: ann.type === "drawing" && (ann as DrawingAnnotation).rotate
            ? `rotate(${(ann as DrawingAnnotation).rotate}deg)`
            : undefined,
          transformOrigin: "center center",
        };

        const showDelete = isSelected || isAlwaysInteractive(ann);

        return (
          <div
            key={ann.id}
            style={common}
            onMouseDown={(e) => handleMouseDown(e, ann)}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (ann.type === "text" && onEditText) onEditText(ann);
              if (ann.type === "signature" && onEditSignature) onEditSignature(ann);
              if (ann.type === "sticky" && onEditSticky) onEditSticky(ann);
              if (ann.type === "shape" && onEditShape) onEditShape(ann);
              if (ann.type === "comment" && onEditComment) onEditComment(ann);
            }}
          >
            {showDelete && (
              <div className="absolute -top-8 left-0 flex gap-0.5 z-20 bg-card border border-border rounded-md px-0.5 py-0.5 shadow-sm" style={{ pointerEvents: "auto" }}>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 w-6 p-0"
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <div className="h-6 w-6 flex items-center justify-center bg-muted rounded cursor-grab" title="Drag to move">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
                {"x" in ann && "y" in ann && (
                  <>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Move up" onClick={(e) => { e.stopPropagation(); onUpdate(ann.id, { y: Math.max(0, ann.y - 1) } as any); }}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Move down" onClick={(e) => { e.stopPropagation(); onUpdate(ann.id, { y: ann.y + 1 } as any); }}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Move left" onClick={(e) => { e.stopPropagation(); onUpdate(ann.id, { x: Math.max(0, ann.x - 1) } as any); }}>
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Move right" onClick={(e) => { e.stopPropagation(); onUpdate(ann.id, { x: ann.x + 1 } as any); }}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {ann.type === "drawing" && (
                  <>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Rotate left" onClick={(e) => { e.stopPropagation(); onUpdate(ann.id, { rotate: (((ann as DrawingAnnotation).rotate || 0) - 15 + 360) % 360 } as any); }}>
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Rotate right" onClick={(e) => { e.stopPropagation(); onUpdate(ann.id, { rotate: (((ann as DrawingAnnotation).rotate || 0) + 15) % 360 } as any); }}>
                      <RotateCw className="h-3 w-3" />
                    </Button>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={(ann as DrawingAnnotation).rotate || 0}
                      title={`${Math.round((ann as DrawingAnnotation).rotate || 0)}°`}
                      className="w-16 h-6"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdate(ann.id, { rotate: Number(e.target.value) } as any)}
                    />
                    <span className="text-[10px] w-7 text-center tabular-nums">{Math.round((ann as DrawingAnnotation).rotate || 0)}°</span>
                  </>
                )}
              </div>
            )}

            {(isSelected || ann.type === "signature") && renderResizeHandles(ann)}
            {isSelected && ann.type === "drawing" && (
              <div
                className="absolute -top-11 left-1/2 -ml-2 h-4 w-4 rounded-full bg-primary border-2 border-background cursor-grab z-30"
                title="Drag to rotate 360°"
                style={{ pointerEvents: "auto" }}
                onMouseDown={(e) => handleRotateDown(e, ann)}
              />
            )}

            {ann.type === "text" && (
              <div
                className="select-none overflow-hidden"
                style={{
                  width: "100%",
                  height: "100%",
                  fontSize: ann.fontSize,
                  color: ann.color || "#111827",
                  backgroundColor: ann.backgroundColor,
                  fontWeight: ann.bold ? 700 : 400,
                  fontStyle: ann.italic ? "italic" : "normal",
                  textDecoration: [ann.underline ? "underline" : "", ann.strikethrough ? "line-through" : ""].filter(Boolean).join(" ") || undefined,
                  fontFamily: editorFontCss(ann.fontFamily),
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  textAlign: ann.align ?? "left",
                  lineHeight: ann.lineHeight ?? 1.35,
                  opacity: ann.opacity ?? 1,
                  transform: ann.rotate ? `rotate(${ann.rotate}deg)` : undefined,
                  transformOrigin: "left top",
                }}
              >
                {formatDisplayLines(ann.text, ann.listStyle).join("\n")}
              </div>
            )}
            {ann.type === "whiteout" && (() => {
              const finish = coverFinish((ann as WhiteoutAnnotation).color);
              const fill = (ann as WhiteoutAnnotation).color || finish.value;
              return (
                <div
                  className="w-full h-full rounded-[3px]"
                  style={{
                    background: `linear-gradient(180deg, ${fill} 0%, ${fill}ee 100%)`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.08)`,
                    border: `1px solid ${finish.border}`,
                  }}
                />
              );
            })()}
            {ann.type === "drawing" && (
              <img
                src={(ann as DrawingAnnotation).imageData}
                alt="Drawing"
                draggable={false}
                className="select-none w-full h-full object-contain"
              />
            )}
            {ann.type === "stamp" && (
              sealByStampLabel((ann as StampAnnotation).label) ? (
                <img
                  src={companySealDataUrl(sealByStampLabel((ann as StampAnnotation).label)!.id)}
                  alt={sealByStampLabel((ann as StampAnnotation).label)!.legalName}
                  draggable={false}
                  className="select-none"
                  style={{ width: (ann as StampAnnotation).width || 150, height: (ann as StampAnnotation).height || 150 }}
                />
              ) : (
                <span className="font-bold text-3xl text-destructive/40 uppercase select-none" style={{ transform: "rotate(-30deg)", display: "inline-block" }}>
                  {(ann as StampAnnotation).label}
                </span>
              )
            )}
            {ann.type === "checkmark" && (
              <span style={{ fontSize: (ann as CheckmarkAnnotation).size }} className="text-green-700 font-bold select-none leading-none">
                {checkGlyph((ann as CheckmarkAnnotation).style || "check")}
              </span>
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
            {ann.type === "shape" && (
              <>
                {renderShape(ann as ShapeAnnotation)}
                {(ann as ShapeAnnotation).text ? (
                  <div
                    className="absolute inset-0 flex items-center overflow-hidden px-2 pointer-events-none"
                    style={{
                      justifyContent: (ann as ShapeAnnotation).align === "center" ? "center" : (ann as ShapeAnnotation).align === "right" ? "flex-end" : "flex-start",
                      fontSize: (ann as ShapeAnnotation).fontSize || 14,
                      color: (ann as ShapeAnnotation).color || "#111827",
                      fontFamily: editorFontCss((ann as ShapeAnnotation).fontFamily),
                      fontWeight: (ann as ShapeAnnotation).bold ? 700 : 400,
                      fontStyle: (ann as ShapeAnnotation).italic ? "italic" : "normal",
                      textDecoration: [(ann as ShapeAnnotation).underline ? "underline" : "", (ann as ShapeAnnotation).strikethrough ? "line-through" : ""].filter(Boolean).join(" ") || undefined,
                      textAlign: (ann as ShapeAnnotation).align || "center",
                      lineHeight: (ann as ShapeAnnotation).lineHeight || 1.25,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {formatDisplayLines((ann as ShapeAnnotation).text || "", (ann as ShapeAnnotation).listStyle).join("\n")}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[10px] text-muted-foreground/70">
                    Double-click to add text
                  </div>
                )}
              </>
            )}
            {ann.type === "comment" && (
              <div
                className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center shadow-md"
                style={{ backgroundColor: (ann as CommentAnnotation).color, opacity: (ann as CommentAnnotation).resolved ? 0.45 : 1 }}
                title={(ann as CommentAnnotation).text || "Comment"}
              >
                {commentNumber(annotations, ann.id) || "•"}
              </div>
            )}
            {ann.type === "image" && (
              <img
                src={(ann as ImageAnnotation).imageData}
                style={{ width: (ann as ImageAnnotation).width, height: (ann as ImageAnnotation).height }}
                className="select-none"
                draggable={false}
                alt="annotation"
              />
            )}
            {ann.type === "signature" && (
              (ann as SignatureAnnotation).imageData ? (
                <img
                  src={(ann as SignatureAnnotation).imageData}
                  alt="Signature"
                  draggable={false}
                  className="select-none object-contain"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="w-full h-full rounded border-2 border-dashed border-slate-400 bg-slate-50/80 flex flex-col justify-end px-2 pb-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Sign here</span>
                  <div className="h-px bg-slate-500/70 mt-1" />
                </div>
              )
            )}
            {ann.type === "sticky" && (
              <div
                className="w-full h-full rounded-sm shadow-sm px-2 py-1.5 text-left overflow-hidden"
                style={{ backgroundColor: (ann as StickyNoteAnnotation).color || "#fde047" }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wide text-amber-900">Next</div>
                <div className="text-[11px] leading-snug text-amber-950 whitespace-pre-wrap">
                  {(ann as StickyNoteAnnotation).text}
                </div>
              </div>
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
  if (shapeType === "rounded") {
    return (
      <svg width={width} height={height} className="select-none">
        <rect x={sw / 2} y={sw / 2} width={Math.max(0, width - sw)} height={Math.max(0, height - sw)} rx={12} ry={12} stroke={strokeColor} fill={fill} strokeWidth={sw} />
      </svg>
    );
  }
  if (shapeType === "circle" || shapeType === "ellipse") {
    return (
      <svg width={width} height={height} className="select-none">
        <ellipse cx={width / 2} cy={height / 2} rx={Math.max(0, width / 2 - sw / 2)} ry={Math.max(0, height / 2 - sw / 2)} stroke={strokeColor} fill={fill} strokeWidth={sw} />
      </svg>
    );
  }
  if (shapeType === "triangle") {
    return (
      <svg width={width} height={height} className="select-none">
        <polygon points={`${width / 2},${sw} ${width - sw},${height - sw} ${sw},${height - sw}`} stroke={strokeColor} fill={fill} strokeWidth={sw} />
      </svg>
    );
  }
  if (shapeType === "diamond") {
    return (
      <svg width={width} height={height} className="select-none">
        <polygon points={`${width / 2},${sw} ${width - sw},${height / 2} ${width / 2},${height - sw} ${sw},${height / 2}`} stroke={strokeColor} fill={fill} strokeWidth={sw} />
      </svg>
    );
  }
  if (shapeType === "arrow") {
    return (
      <svg width={width} height={height} className="select-none">
        <line x1={0} y1={height / 2} x2={width * 0.68} y2={height / 2} stroke={strokeColor} strokeWidth={sw} />
        <polygon points={`${width * 0.68},${height * 0.2} ${width - 2},${height / 2} ${width * 0.68},${height * 0.8}`} fill={strokeColor} />
      </svg>
    );
  }
  return (
    <svg width={width} height={height} className="select-none">
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={strokeColor} strokeWidth={sw} />
    </svg>
  );
}
