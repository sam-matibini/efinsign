import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  GripVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TextAlign } from "@/lib/textLayout";
import { clampRect, snapRect } from "@/lib/textLayout";
import type { ResizeDir } from "./resizeHandles";
import { MIN_SIZE, renderResizeHandles } from "./resizeHandles";

interface TextBoxEditorProps {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  align: TextAlign;
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  lineHeight?: number;
  pageWidth: number;
  pageHeight: number;
  otherRects: { x: number; y: number; w: number; h: number }[];
  onChange: (next: { x: number; y: number; width: number; height: number; text: string; align: TextAlign }) => void;
  onCommit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function TextBoxEditor({
  x, y, width, height, text, fontSize, align, color, backgroundColor, fontFamily, bold, italic,
  underline, strikethrough, lineHeight, pageWidth, pageHeight, otherRects,
  onChange, onCommit, onCancel, onDelete,
}: TextBoxEditorProps) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{
    dir: ResizeDir; startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number;
  } | null>(null);
  const [guides, setGuides] = useState<{ v: number | null; h: number | null }>({ v: null, h: null });

  const updateBox = useCallback((nx: number, ny: number, nw: number, nh: number, stick: boolean) => {
    const raw = { x: nx, y: ny, w: nw, h: nh };
    if (stick) {
      const snapped = snapRect(raw, otherRects, pageWidth, pageHeight);
      const clamped = clampRect({ ...raw, x: snapped.x, y: snapped.y }, pageWidth, pageHeight);
      setGuides({ v: snapped.guideV, h: snapped.guideH });
      onChange({ x: clamped.x, y: clamped.y, width: clamped.w, height: clamped.h, text, align });
      return;
    }
    const clamped = clampRect(raw, pageWidth, pageHeight);
    setGuides({ v: null, h: null });
    onChange({ x: clamped.x, y: clamped.y, width: clamped.w, height: clamped.h, text, align });
  }, [align, onChange, otherRects, pageHeight, pageWidth, text]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        updateBox(dragRef.current.origX + dx, dragRef.current.origY + dy, width, height, true);
      } else if (resizeRef.current) {
        const r = resizeRef.current;
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        let nx = r.origX, ny = r.origY, nw = r.origW, nh = r.origH;
        if (r.dir.includes("e")) nw = Math.max(MIN_SIZE, nw + dx);
        if (r.dir.includes("w")) { nw = Math.max(MIN_SIZE, nw - dx); nx = r.origX + (r.origW - nw); }
        if (r.dir.includes("s")) nh = Math.max(MIN_SIZE, nh + dy);
        if (r.dir.includes("n")) { nh = Math.max(MIN_SIZE, nh - dy); ny = r.origY + (r.origH - nh); }
        updateBox(nx, ny, nw, nh, false);
      }
    };
    const up = () => {
      dragRef.current = null;
      resizeRef.current = null;
      setGuides({ v: null, h: null });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [height, updateBox, width]);

  const nudge = (dx: number, dy: number) => {
    updateBox(x + dx, y + dy, width, height, false);
  };

  const decorations = [underline ? "underline" : "", strikethrough ? "line-through" : ""].filter(Boolean).join(" ");

  return (
    <>
      {guides.v !== null && (
        <div className="absolute top-0 bottom-0 w-px bg-primary/80 z-40 pointer-events-none" style={{ left: guides.v }} />
      )}
      {guides.h !== null && (
        <div className="absolute left-0 right-0 h-px bg-primary/80 z-40 pointer-events-none" style={{ top: guides.h }} />
      )}
      <div
        className="absolute z-30"
        style={{ left: x, top: y, width, height }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-9 left-0 flex items-center gap-0.5 bg-card border border-border rounded-md px-1 py-0.5 shadow-sm z-40">
          <button
            type="button"
            className="h-6 w-6 flex items-center justify-center cursor-grab text-muted-foreground"
            title="Drag to move"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragRef.current = { startX: e.clientX, startY: e.clientY, origX: x, origY: y };
            }}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" title="Move up" onMouseDown={(e) => e.preventDefault()} onClick={() => nudge(0, -1)}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" title="Move down" onMouseDown={(e) => e.preventDefault()} onClick={() => nudge(0, 1)}>
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" title="Move left" onMouseDown={(e) => e.preventDefault()} onClick={() => nudge(-1, 0)}>
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" title="Move right" onMouseDown={(e) => e.preventDefault()} onClick={() => nudge(1, 0)}>
            <ArrowRight className="h-3 w-3" />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          {([
            ["left", AlignLeft],
            ["center", AlignCenter],
            ["right", AlignRight],
          ] as const).map(([value, Icon]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={align === value ? "default" : "ghost"}
              className="h-6 w-6 p-0"
              title={`Align ${value}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange({ x, y, width, height, text, align: value })}
            >
              <Icon className="h-3 w-3" />
            </Button>
          ))}
          {onDelete && (
            <>
              <div className="w-px h-4 bg-border mx-0.5" />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-6 w-6 p-0"
                title="Delete text"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>

        <Textarea
          autoFocus
          value={text}
          placeholder="Type here. Text wraps inside this box."
          onChange={(e) => onChange({ x, y, width, height, text: e.target.value, align })}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onCommit();
            }
          }}
          className="w-full h-full min-h-0 resize-none p-1 border-primary"
          style={{
            fontSize,
            lineHeight: lineHeight ?? 1.25,
            textAlign: align,
            color,
            backgroundColor: backgroundColor && backgroundColor !== "none" ? backgroundColor : "hsl(var(--background) / 0.9)",
            fontFamily,
            fontWeight: bold ? 700 : 400,
            fontStyle: italic ? "italic" : "normal",
            textDecoration: decorations || undefined,
          }}
        />

        {renderResizeHandles(width, height, (e, dir) => {
          e.preventDefault();
          e.stopPropagation();
          resizeRef.current = {
            dir, startX: e.clientX, startY: e.clientY,
            origX: x, origY: y, origW: width, origH: height,
          };
        })}
      </div>
    </>
  );
}
