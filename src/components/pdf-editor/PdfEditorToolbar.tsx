import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import StampPicker from "@/components/StampPicker";
import {
  ArrowLeft, Type, Paintbrush, Stamp, Save, Loader2, MousePointer,
  Check, Highlighter, Shapes, ImageIcon, Square, Circle, Minus,
  Undo2, Redo2
} from "lucide-react";
import type { ToolMode, ShapeType } from "./types";

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fde047" },
  { label: "Green", value: "#86efac" },
  { label: "Blue", value: "#93c5fd" },
  { label: "Pink", value: "#f9a8d4" },
];

interface PdfEditorToolbarProps {
  docTitle: string;
  tool: ToolMode;
  setTool: (t: ToolMode) => void;
  fontSize: number;
  setFontSize: (s: number) => void;
  drawColor: string;
  setDrawColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  selectedStamp: string | null;
  setSelectedStamp: (s: string | null) => void;
  checkmarkSize: number;
  setCheckmarkSize: (s: number) => void;
  highlightColor: string;
  setHighlightColor: (c: string) => void;
  highlightOpacity: number;
  setHighlightOpacity: (o: number) => void;
  shapeType: ShapeType;
  setShapeType: (t: ShapeType) => void;
  shapeStrokeColor: string;
  setShapeStrokeColor: (c: string) => void;
  shapeFillColor: string;
  setShapeFillColor: (c: string) => void;
  shapeStrokeWidth: number;
  setShapeStrokeWidth: (w: number) => void;
  onImageUpload: (file: File) => void;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function PdfEditorToolbar(props: PdfEditorToolbarProps) {
  const {
    docTitle, tool, setTool, fontSize, setFontSize,
    drawColor, setDrawColor, strokeWidth, setStrokeWidth,
    selectedStamp, setSelectedStamp, checkmarkSize, setCheckmarkSize,
    highlightColor, setHighlightColor, highlightOpacity, setHighlightOpacity,
    shapeType, setShapeType, shapeStrokeColor, setShapeStrokeColor,
    shapeFillColor, setShapeFillColor, shapeStrokeWidth, setShapeStrokeWidth,
    onImageUpload, saving, onSave, onBack,
    onUndo, onRedo, canUndo, canRedo,
  } = props;

  const tools: { mode: ToolMode; icon: any; label: string }[] = [
    { mode: "select", icon: MousePointer, label: "Select" },
    { mode: "text", icon: Type, label: "Text" },
    { mode: "draw", icon: Paintbrush, label: "Draw" },
    { mode: "stamp", icon: Stamp, label: "Stamp" },
    { mode: "checkmark", icon: Check, label: "Check" },
    { mode: "highlight", icon: Highlighter, label: "Highlight" },
    { mode: "shape", icon: Shapes, label: "Shape" },
    { mode: "image", icon: ImageIcon, label: "Image" },
  ];

  return (
    <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-card/60 shrink-0 flex-wrap">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <div className="h-6 w-px bg-border" />
      <h2 className="font-semibold text-sm truncate max-w-48">{docTitle}</h2>
      <div className="h-6 w-px bg-border" />

      {/* Undo/Redo */}
      <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="h-8 w-8 p-0">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="h-8 w-8 p-0">
        <Redo2 className="h-4 w-4" />
      </Button>
      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-1">
        {tools.map(({ mode, icon: Icon, label }) => (
          <Button
            key={mode}
            variant={tool === mode ? "default" : "ghost"}
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setTool(mode)}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </Button>
        ))}
      </div>

      {/* Text options */}
      {tool === "text" && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Size:</Label>
          <Select value={String(fontSize)} onValueChange={(v) => setFontSize(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36].map((s) => (
                <SelectItem key={s} value={String(s)}>{s}px</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Draw options */}
      {tool === "draw" && (
        <div className="flex items-center gap-2">
          <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="h-7 w-7 rounded cursor-pointer" />
          <Label className="text-xs">Width:</Label>
          <Select value={String(strokeWidth)} onValueChange={(v) => setStrokeWidth(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 5, 8, 12].map((w) => (
                <SelectItem key={w} value={String(w)}>{w}px</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stamp options */}
      {tool === "stamp" && <StampPicker selected={selectedStamp} onSelect={setSelectedStamp} />}

      {/* Checkmark options */}
      {tool === "checkmark" && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Size:</Label>
          <Select value={String(checkmarkSize)} onValueChange={(v) => setCheckmarkSize(Number(v))}>
            <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="18">Small</SelectItem>
              <SelectItem value="28">Medium</SelectItem>
              <SelectItem value="40">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Highlight options */}
      {tool === "highlight" && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                className={`h-6 w-6 rounded border-2 ${highlightColor === c.value ? "border-primary" : "border-transparent"}`}
                style={{ backgroundColor: c.value }}
                onClick={() => setHighlightColor(c.value)}
                title={c.label}
              />
            ))}
          </div>
          <Label className="text-xs">Opacity:</Label>
          <input
            type="range" min="0.1" max="0.8" step="0.1"
            value={highlightOpacity}
            onChange={(e) => setHighlightOpacity(Number(e.target.value))}
            className="w-20"
          />
        </div>
      )}

      {/* Shape options */}
      {tool === "shape" && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {([
              { t: "rect" as ShapeType, icon: Square },
              { t: "circle" as ShapeType, icon: Circle },
              { t: "line" as ShapeType, icon: Minus },
            ]).map(({ t, icon: Icon }) => (
              <Button key={t} variant={shapeType === t ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setShapeType(t)}>
                <Icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
          <input type="color" value={shapeStrokeColor} onChange={(e) => setShapeStrokeColor(e.target.value)} className="h-6 w-6 rounded cursor-pointer" title="Stroke" />
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="h-6 w-6 rounded border border-border cursor-pointer"
                style={{ backgroundColor: shapeFillColor === "none" ? "transparent" : shapeFillColor }}
                title="Fill"
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 flex gap-1">
              <button className="h-6 w-6 rounded border border-border bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,hsl(var(--muted))_3px,hsl(var(--muted))_6px)]" onClick={() => setShapeFillColor("none")} title="None" />
              {["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#000000", "#ffffff"].map((c) => (
                <button key={c} className="h-6 w-6 rounded border border-border" style={{ backgroundColor: c }} onClick={() => setShapeFillColor(c)} />
              ))}
            </PopoverContent>
          </Popover>
          <Select value={String(shapeStrokeWidth)} onValueChange={(v) => setShapeStrokeWidth(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 5, 8].map((w) => (<SelectItem key={w} value={String(w)}>{w}px</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Image upload */}
      {tool === "image" && (
        <div className="flex items-center gap-2">
          <Label htmlFor="img-upload" className="text-xs cursor-pointer bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/80">
            Choose Image
          </Label>
          <input
            id="img-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f); e.target.value = ""; }}
          />
        </div>
      )}

      <div className="flex-1" />
      <Button onClick={onSave} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : "Save PDF"}
      </Button>
    </div>
  );
}
