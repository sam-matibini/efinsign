import { useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { fontSizeForFieldHeight, isTextLikeField } from "@/lib/fieldFont";
import { checkAppearance, checkGlyph } from "@/lib/checkStyles";
import { companySealDataUrl, sealByStampLabel } from "@/lib/companySeals";

interface DraggableFieldProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
  value?: string | null;
  fieldType?: string;
  onMove: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number, x?: number, y?: number) => void;
  onDelete?: (id: string) => void;
  onAdjustFont?: (id: string, direction: 1 | -1) => void;
}

const MIN_W = 40;
const MIN_H = 20;
const HANDLE_SIZE = 6;

type Corner = "nw" | "ne" | "sw" | "se";

const CURSORS: Record<Corner, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
};

export default function DraggableField({ id, x, y, width, height, color, label, value, fieldType, onMove, onResize, onDelete, onAdjustFont }: DraggableFieldProps) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);

    const el = e.currentTarget as HTMLElement;
    const handleMouseMove = (ev: MouseEvent) => {
      const parent = el.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const newX = Math.max(0, Math.min(ev.clientX - parentRect.left - offsetRef.current.x, parentRect.width - width));
      const newY = Math.max(0, Math.min(ev.clientY - parentRect.top - offsetRef.current.y, parentRect.height - height));
      onMove(id, Math.round(newX), Math.round(newY));
    };

    const handleMouseUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [id, width, height, onMove]);

  const handleResizeMouseDown = useCallback((corner: Corner, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onResize) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = width;
    const startH = height;
    const startFieldX = x;
    const startFieldY = y;

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newW = startW;
      let newH = startH;
      let newX = startFieldX;
      let newY = startFieldY;

      switch (corner) {
        case "se":
          newW = Math.max(MIN_W, startW + dx);
          newH = Math.max(MIN_H, startH + dy);
          break;
        case "sw":
          newW = Math.max(MIN_W, startW - dx);
          newH = Math.max(MIN_H, startH + dy);
          newX = startFieldX + startW - newW;
          break;
        case "ne":
          newW = Math.max(MIN_W, startW + dx);
          newH = Math.max(MIN_H, startH - dy);
          newY = startFieldY + startH - newH;
          break;
        case "nw":
          newW = Math.max(MIN_W, startW - dx);
          newH = Math.max(MIN_H, startH - dy);
          newX = startFieldX + startW - newW;
          newY = startFieldY + startH - newH;
          break;
      }

      onResize(id, Math.round(newW), Math.round(newH), Math.round(newX), Math.round(newY));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [id, x, y, width, height, onResize]);

  const handleStyle = (corner: Corner): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: "absolute",
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      backgroundColor: color,
      cursor: CURSORS[corner],
      zIndex: 10,
    };
    switch (corner) {
      case "nw": return { ...base, top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 };
      case "ne": return { ...base, top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 };
      case "sw": return { ...base, bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 };
      case "se": return { ...base, bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 };
    }
  };

  const corners: Corner[] = ["nw", "ne", "sw", "se"];
  const textSize = fontSizeForFieldHeight(height);
  const seal = fieldType === "seal" ? sealByStampLabel(value) : null;
  const check = fieldType === "checkmark" || fieldType === "checkbox" ? checkAppearance(value) : null;

  return (
    <div
      className={`absolute border-2 rounded flex items-center justify-center text-xs font-medium select-none overflow-hidden ${dragging ? "opacity-90 shadow-lg z-50" : "opacity-80 cursor-move"}`}
      style={{
        left: x,
        top: y,
        width,
        height,
        borderColor: color,
        backgroundColor: (fieldType === "signature" || fieldType === "initials") && value?.startsWith("data:image") ? "transparent" : `${color}20`,
        color,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {(fieldType === "signature" || fieldType === "initials" || fieldType === "seal") && (value?.startsWith("data:image") || seal) ? (
        <img src={seal ? companySealDataUrl(seal.id) : value!} alt={fieldType} className="w-full h-full object-contain pointer-events-none" draggable={false} />
      ) : check?.filled ? (
        <span className="font-bold text-green-700 leading-none" style={{ fontSize: textSize }}>{checkGlyph(check.style)}</span>
      ) : isTextLikeField(fieldType) && value ? (
        <span className="px-1 w-full h-full overflow-hidden whitespace-pre-wrap break-words leading-tight text-left" style={{ fontSize: textSize }}>{value}</span>
      ) : value && !value.startsWith("style:") ? (
        <span className="px-1 w-full h-full overflow-hidden whitespace-pre-wrap break-words leading-tight text-left" style={{ fontSize: textSize }}>{value}</span>
      ) : (
        label
      )}
      {(hovered || dragging) && onAdjustFont && isTextLikeField(fieldType) && (
        <div className="absolute -bottom-7 left-0 flex gap-1 z-20" onMouseDown={(e) => e.stopPropagation()}>
          <button type="button" className="h-6 px-1.5 rounded bg-card border text-[11px]" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAdjustFont(id, -1); }}>A−</button>
          <span className="h-6 px-1 rounded bg-card border text-[10px] flex items-center">{textSize}</span>
          <button type="button" className="h-6 px-1.5 rounded bg-card border text-xs font-semibold" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAdjustFont(id, 1); }}>A+</button>
        </div>
      )}
      {(hovered || dragging) && onDelete && (
        <button
          className="absolute -top-3 -right-3 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 z-20"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {(hovered || dragging) && onResize && corners.map((c) => (
        <div key={c} style={handleStyle(c)} onMouseDown={(e) => handleResizeMouseDown(c, e)} />
      ))}
    </div>
  );
}
