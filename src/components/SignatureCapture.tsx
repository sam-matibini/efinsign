import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenTool, Type, Eraser } from "lucide-react";

const SIGNATURE_FONTS = [
  "'Dancing Script', cursive",
  "'Great Vibes', cursive",
  "'Pacifico', cursive",
  "'Caveat', cursive",
];

const COLOR_PRESETS = [
  { value: "#000000", label: "Black" },
  { value: "#1e3a5f", label: "Dark Blue" },
  { value: "#8b1a1a", label: "Dark Red" },
  { value: "#1a5c2e", label: "Dark Green" },
  { value: "#0a1f44", label: "Navy Blue" },
  { value: "#1a56db", label: "Royal Blue" },
  { value: "#5b21b6", label: "Purple" },
  { value: "#5c3317", label: "Brown" },
];

interface SignatureCaptureProps {
  onSave: (imageData: string) => void;
  onCancel?: () => void;
  saveLabel?: string;
  compact?: boolean;
}

export default function SignatureCapture({ onSave, onCancel, saveLabel = "Save", compact = false }: SignatureCaptureProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0]);
  const [activeTab, setActiveTab] = useState("draw");
  const [selectedColor, setSelectedColor] = useState("#000000");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getCoords(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    ctx.lineWidth = 2.5 + pressure * 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = selectedColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [selectedColor]);

  const endDraw = useCallback(() => {
    isDrawing.current = false;
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  }, []);

  const generateTypedSignature = useCallback((): string | null => {
    if (!typedName) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    ctx.font = `56px ${selectedFont}`;
    ctx.fillStyle = selectedColor;
    ctx.fillText(typedName, 20, 60);
    return canvas.toDataURL();
  }, [typedName, selectedFont, selectedColor]);

  const handleSave = () => {
    const data = activeTab === "draw" ? signatureData : generateTypedSignature();
    if (!data) return;
    onSave(data);
  };

  const canSave = activeTab === "draw" ? !!signatureData : !!typedName;

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={compact ? "w-full" : "mb-3"}>
          <TabsTrigger value="draw" className="gap-1.5 flex-1">
            <PenTool className="h-3 w-3" /> Draw
          </TabsTrigger>
          <TabsTrigger value="type" className="gap-1.5 flex-1">
            <Type className="h-3 w-3" /> Type
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="mt-3">
          <div className="border border-border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={compact ? 600 : 800}
              height={compact ? 150 : 250}
              className="w-full bg-white cursor-crosshair"
              style={{ touchAction: "none" }}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
          </div>
          <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={clearCanvas}>
            <Eraser className="h-3 w-3" /> Clear
          </Button>
        </TabsContent>

        <TabsContent value="type" className="mt-3 space-y-3">
          <Input
            placeholder="Type your full name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
          />
          {typedName && (
            <div className={`grid ${compact ? "grid-cols-1" : "grid-cols-2"} gap-2`}>
              {SIGNATURE_FONTS.map((font) => (
                <div
                  key={font}
                  className={`p-3 rounded-lg border cursor-pointer text-center transition-colors ${
                    selectedFont === font
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  style={{ fontFamily: font, fontSize: compact ? "1.25rem" : "1.5rem", color: selectedColor }}
                  onClick={() => setSelectedFont(font)}
                >
                  {typedName}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Color Picker */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Color:</span>
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.value}
            title={c.label}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              selectedColor === c.value ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border"
            }`}
            style={{ backgroundColor: c.value }}
            onClick={() => setSelectedColor(c.value)}
          />
        ))}
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border border-border"
          title="Custom color"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!canSave} className="flex-1" size={compact ? "sm" : "default"}>
          {saveLabel}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} size={compact ? "sm" : "default"}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
