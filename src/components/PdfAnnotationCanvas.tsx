import { useRef, useEffect, useState, useCallback } from "react";

interface PdfAnnotationCanvasProps {
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  active: boolean;
  onDrawingComplete: (imageData: string) => void;
  existingDrawing?: string;
}

export default function PdfAnnotationCanvas({
  width,
  height,
  color,
  strokeWidth,
  active,
  onDrawingComplete,
  existingDrawing,
}: PdfAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    if (existingDrawing) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = existingDrawing;
    }
  }, [existingDrawing, width, height]);

  const getPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (width / rect.width),
      y: (e.clientY - rect.top) * (height / rect.height),
    };
  }, [width, height]);

  const startDraw = useCallback((e: React.MouseEvent) => {
    if (!active) return;
    setDrawing(true);
    lastPoint.current = getPos(e);
  }, [active, getPos]);

  const draw = useCallback((e: React.MouseEvent) => {
    if (!drawing || !active) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current!.x, lastPoint.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
  }, [drawing, active, color, strokeWidth, getPos]);

  const endDraw = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    lastPoint.current = null;
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onDrawingComplete(dataUrl);
  }, [drawing, onDrawingComplete]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0"
      style={{
        pointerEvents: active ? "auto" : "none",
        cursor: active ? "crosshair" : "default",
        width: "100%",
        height: "100%",
      }}
      onMouseDown={startDraw}
      onMouseMove={draw}
      onMouseUp={endDraw}
      onMouseLeave={endDraw}
    />
  );
}
