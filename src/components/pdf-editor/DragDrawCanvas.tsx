import { useRef, useState, useCallback, useEffect } from "react";

interface DragDrawCanvasProps {
  active: boolean;
  onComplete: (x: number, y: number, width: number, height: number) => void;
  onPoint?: (x: number, y: number) => void;
  onActivate?: () => void;
  previewColor?: string;
  previewOpacity?: number;
}

export default function DragDrawCanvas({
  active,
  onComplete,
  onPoint,
  onActivate,
  previewColor = "#fde047",
  previewOpacity = 0.3,
}: DragDrawCanvasProps) {
  const [rect, setRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef(rect);
  rectRef.current = rect;

  const posInPage = (e: { clientX: number; clientY: number }) => {
    const box = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    onActivate?.();
    const p = posInPage(e);
    setRect({ startX: p.x, startY: p.y, endX: p.x, endY: p.y });
  }, [active, onActivate]);

  useEffect(() => {
    if (!rect) return;
    const move = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const p = posInPage(e);
      setRect((prev) => (prev ? { ...prev, endX: p.x, endY: p.y } : null));
    };
    const up = () => {
      const current = rectRef.current;
      setRect(null);
      if (!current) return;
      const x = Math.min(current.startX, current.endX);
      const y = Math.min(current.startY, current.endY);
      const w = Math.abs(current.endX - current.startX);
      const h = Math.abs(current.endY - current.startY);
      if (w > 5 && h > 5) onComplete(x, y, w, h);
      else onPoint?.(current.startX, current.startY);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [rect, onComplete, onPoint]);

  if (!active) return null;

  const preview = rect ? {
    left: Math.min(rect.startX, rect.endX),
    top: Math.min(rect.startY, rect.endY),
    width: Math.abs(rect.endX - rect.startX),
    height: Math.abs(rect.endY - rect.startY),
  } : null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20"
      style={{ cursor: "crosshair" }}
      onMouseDown={handleMouseDown}
    >
      {preview && (
        <div
          className="absolute border-2 border-dashed rounded pointer-events-none"
          style={{
            left: preview.left,
            top: preview.top,
            width: preview.width,
            height: preview.height,
            backgroundColor: previewColor,
            opacity: Math.max(0.2, previewOpacity),
            borderColor: previewColor,
          }}
        />
      )}
    </div>
  );
}
