import { useRef, useState, useCallback } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trash2, X } from "lucide-react";
import { fontSizeForFieldHeight, isTextLikeField } from "@/lib/fieldFont";
import { checkAppearance, checkGlyph } from "@/lib/checkStyles";
import { companySealDataUrl, sealByStampLabel } from "@/lib/companySeals";
import { editorFontCss } from "@/lib/editorFonts";
import { decodeFieldValue, type FieldStyle } from "@/lib/fieldStyle";

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
  selected?: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number, x?: number, y?: number) => void;
  onDelete?: (id: string) => void;
  onAdjustFont?: (id: string, direction: 1 | -1) => void;
  onEdit?: (id: string) => void;
  onSelect?: (id: string) => void;
}

const MIN_W = 40;
const MIN_H = 20;
const HANDLE_SIZE = 8;

type HandleDir = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

const CURSORS: Record<HandleDir, string> = {
  nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize",
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
};

export default function DraggableField({
  id, x, y, width, height, color, label, value, fieldType, selected,
  onMove, onResize, onDelete, onAdjustFont, onEdit, onSelect,
}: DraggableFieldProps) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const decoded = decodeFieldValue(value);
  const style: FieldStyle = decoded.style;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id);
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
  }, [id, width, height, onMove, onSelect]);

  const handleResizeMouseDown = useCallback((dir: HandleDir, e: React.MouseEvent) => {
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

      if (dir.includes("e")) newW = Math.max(MIN_W, startW + dx);
      if (dir.includes("w")) {
        newW = Math.max(MIN_W, startW - dx);
        newX = startFieldX + startW - newW;
      }
      if (dir.includes("s")) newH = Math.max(MIN_H, startH + dy);
      if (dir.includes("n")) {
        newH = Math.max(MIN_H, startH - dy);
        newY = startFieldY + startH - newH;
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

  const handleStyle = (dir: HandleDir): React.CSSProperties => {
    const half = HANDLE_SIZE / 2;
    const base: React.CSSProperties = {
      position: "absolute",
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      backgroundColor: color,
      cursor: CURSORS[dir],
      zIndex: 10,
    };
    const map: Record<HandleDir, React.CSSProperties> = {
      nw: { ...base, top: -half, left: -half },
      ne: { ...base, top: -half, right: -half },
      sw: { ...base, bottom: -half, left: -half },
      se: { ...base, bottom: -half, right: -half },
      n: { ...base, top: -half, left: width / 2 - half },
      s: { ...base, bottom: -half, left: width / 2 - half },
      e: { ...base, right: -half, top: height / 2 - half },
      w: { ...base, left: -half, top: height / 2 - half },
    };
    return map[dir];
  };

  const dirs: HandleDir[] = ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
  const textSize = fontSizeForFieldHeight(height);
  const seal = fieldType === "seal" ? sealByStampLabel(value) : null;
  const check = fieldType === "checkmark" || fieldType === "checkbox" ? checkAppearance(value) : null;
  const showChrome = hovered || dragging || selected;
  const textLike = isTextLikeField(fieldType);
  const decorations = [style.underline ? "underline" : "", style.strikethrough ? "line-through" : ""].filter(Boolean).join(" ");

  const nudge = (dx: number, dy: number) => onMove(id, Math.max(0, x + dx), Math.max(0, y + dy));

  return (
    <div
      className={`absolute border-2 rounded flex items-center justify-center text-xs font-medium select-none overflow-visible ${dragging ? "opacity-90 shadow-lg z-50" : "opacity-90 cursor-move"}`}
      style={{
        left: x,
        top: y,
        width,
        height,
        borderColor: color,
        outline: selected ? "2px dashed hsl(var(--primary))" : "none",
        outlineOffset: 2,
        backgroundColor: (fieldType === "signature" || fieldType === "initials") && value?.startsWith("data:image")
          ? "transparent"
          : style.backgroundColor && style.backgroundColor !== "none"
            ? style.backgroundColor
            : `${color}20`,
        color: style.color || color,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onEdit && (textLike || fieldType === "signature" || fieldType === "initials")) onEdit(id);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
        {(fieldType === "signature" || fieldType === "initials" || fieldType === "seal") && (value?.startsWith("data:image") || seal) ? (
          <img src={seal ? companySealDataUrl(seal.id) : value!} alt={fieldType} className="w-full h-full object-contain" draggable={false} />
        ) : check?.filled ? (
          <span className="font-bold text-green-700 leading-none" style={{ fontSize: textSize }}>{checkGlyph(check.style)}</span>
        ) : textLike && decoded.text ? (
          <span
            className="px-1 w-full h-full overflow-hidden whitespace-pre-wrap break-words leading-tight"
            style={{
              fontSize: textSize,
              textAlign: style.align || "left",
              fontFamily: editorFontCss(style.fontFamily),
              fontWeight: style.bold ? 700 : 400,
              fontStyle: style.italic ? "italic" : "normal",
              textDecoration: decorations || undefined,
              lineHeight: style.lineHeight || 1.25,
              color: style.color || color,
            }}
          >
            {decoded.text}
          </span>
        ) : value && !value.startsWith("style:") && !value.startsWith("data:") ? (
          <span className="px-1 w-full h-full overflow-hidden whitespace-pre-wrap break-words leading-tight text-left" style={{ fontSize: textSize }}>{decoded.text || value}</span>
        ) : (
          label
        )}
      </div>
      {showChrome && (
        <div className="absolute -top-8 left-0 flex items-center gap-0.5 bg-card border border-border rounded-md px-0.5 py-0.5 shadow-sm z-20" onMouseDown={(e) => e.stopPropagation()}>
          <button type="button" className="h-6 w-6 flex items-center justify-center" title="Move up" onClick={() => nudge(0, -1)}><ArrowUp className="h-3 w-3" /></button>
          <button type="button" className="h-6 w-6 flex items-center justify-center" title="Move down" onClick={() => nudge(0, 1)}><ArrowDown className="h-3 w-3" /></button>
          <button type="button" className="h-6 w-6 flex items-center justify-center" title="Move left" onClick={() => nudge(-1, 0)}><ArrowLeft className="h-3 w-3" /></button>
          <button type="button" className="h-6 w-6 flex items-center justify-center" title="Move right" onClick={() => nudge(1, 0)}><ArrowRight className="h-3 w-3" /></button>
          {onDelete && (
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center text-destructive"
              title="Delete field"
              onClick={() => onDelete(id)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      {showChrome && onAdjustFont && textLike && (
        <div className="absolute -bottom-7 left-0 flex gap-1 z-20" onMouseDown={(e) => e.stopPropagation()}>
          <button type="button" className="h-6 px-1.5 rounded bg-card border text-[11px]" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAdjustFont(id, -1); }}>A−</button>
          <span className="h-6 px-1 rounded bg-card border text-[10px] flex items-center">{textSize}</span>
          <button type="button" className="h-6 px-1.5 rounded bg-card border text-xs font-semibold" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAdjustFont(id, 1); }}>A+</button>
        </div>
      )}
      {onDelete && (
        <button
          className="absolute -top-3 -right-3 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 z-20"
          title="Delete"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {showChrome && onResize && dirs.map((c) => (
        <div key={c} style={handleStyle(c)} onMouseDown={(e) => handleResizeMouseDown(c, e)} />
      ))}
    </div>
  );
}
