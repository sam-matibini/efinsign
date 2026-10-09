import { useRef, useState, useCallback } from "react";

interface DragDrawCanvasProps {
  active: boolean;
  onComplete: (x: number, y: number, width: number, height: number) => void;
  previewColor?: string;
  previewOpacity?: number;
}

export default function DragDrawCanvas({ active, onComplete, previewColor = "#fde047", previewOpacity = 0.3 }: DragDrawCanvasProps) {
  const [rect, setRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!active) return;
    const r = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setRect({ startX: x, startY: y, endX: x, endY: y });
  }, [active]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!rect) return;
    const r = containerRef.current!.getBoundingClientRect();
    setRect((prev) => prev ? { ...prev, endX: e.clientX - r.left, endY: e.clientY - r.top } : null);
  }, [rect]);

  const handleMouseUp = useCallback(() => {
    if (!rect) return;
    const x = Math.min(rect.startX, rect.endX);
    const y = Math.min(rect.startY, rect.endY);
    const w = Math.abs(rect.endX - rect.startX);
    const h = Math.abs(rect.endY - rect.startY);
    if (w > 5 && h > 5) {
      onComplete(x, y, w, h);
    }
    setRect(null);
  }, [rect, onComplete]);

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
      className="absolute inset-0 z-10"
      style={{ cursor: "crosshair" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {preview && (
        <div
          className="absolute border-2 border-dashed rounded"
          style={{
            left: preview.left,
            top: preview.top,
            width: preview.width,
            height: preview.height,
            backgroundColor: previewColor,
            opacity: previewOpacity,
            borderColor: previewColor,
          }}
        />
      )}
    </div>
  );
}
