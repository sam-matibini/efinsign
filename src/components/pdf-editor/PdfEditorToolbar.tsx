import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import StampPicker from "@/components/StampPicker";
import {
  ArrowLeft, Type, Paintbrush, Stamp, Save, Loader2, MousePointer,
  Check, Highlighter, Shapes, ImageIcon, Square, Circle, Minus,
  Undo2, Redo2, Eraser, Droplets, PanelTop, Bold, Italic, Underline,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
  PenTool, StickyNote, Triangle, Diamond, ArrowRight, Radius,
} from "lucide-react";
import type { EditorFont, ListStyle, ToolMode, ShapeType, TextAlign } from "./types";
import { CHECK_STYLES, type CheckStyle } from "@/lib/checkStyles";
import { EDITOR_FONTS, HIGHLIGHT_BG_PRESETS, LINE_SPACING } from "@/lib/editorFonts";
import { COVER_FINISHES, DRAW_INK_COLORS } from "@/lib/editorMarks";

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
  textColor: string;
  setTextColor: (c: string) => void;
  textBackground: string;
  setTextBackground: (c: string) => void;
  textFont: EditorFont;
  setTextFont: (f: EditorFont) => void;
  textBold: boolean;
  setTextBold: (b: boolean) => void;
  textItalic: boolean;
  setTextItalic: (b: boolean) => void;
  textUnderline: boolean;
  setTextUnderline: (b: boolean) => void;
  textStrike: boolean;
  setTextStrike: (b: boolean) => void;
  textAlign: TextAlign;
  setTextAlign: (a: TextAlign) => void;
  lineHeight: number;
  setLineHeight: (n: number) => void;
  listStyle: ListStyle;
  setListStyle: (s: ListStyle) => void;
  drawColor: string;
  setDrawColor: (c: string) => void;
  coverColor: string;
  setCoverColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  selectedStamp: string | null;
  setSelectedStamp: (s: string | null) => void;
  checkmarkSize: number;
  setCheckmarkSize: (s: number) => void;
  checkStyle: CheckStyle;
  setCheckStyle: (s: CheckStyle) => void;
  onBumpFont: (delta: number) => void;
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
  onOpenWatermark: () => void;
  onOpenHeaderFooter: () => void;
  onNextAction?: () => void;
}

export default function PdfEditorToolbar(props: PdfEditorToolbarProps) {
  const {
    docTitle, tool, setTool, fontSize, setFontSize,
    textColor, setTextColor, textBackground, setTextBackground,
    textFont, setTextFont, textBold, setTextBold,
    textItalic, setTextItalic, textUnderline, setTextUnderline, textStrike, setTextStrike,
    textAlign, setTextAlign, lineHeight, setLineHeight, listStyle, setListStyle,
    drawColor, setDrawColor, coverColor, setCoverColor, strokeWidth, setStrokeWidth,
    selectedStamp, setSelectedStamp, checkmarkSize, setCheckmarkSize,
    checkStyle, setCheckStyle, onBumpFont,
    highlightColor, setHighlightColor, highlightOpacity, setHighlightOpacity,
    shapeType, setShapeType, shapeStrokeColor, setShapeStrokeColor,
    shapeFillColor, setShapeFillColor, shapeStrokeWidth, setShapeStrokeWidth,
    onImageUpload, saving, onSave, onBack,
    onUndo, onRedo, canUndo, canRedo,
    onOpenWatermark, onOpenHeaderFooter, onNextAction,
  } = props;

  const tools: { mode: ToolMode; icon: any; label: string }[] = [
    { mode: "select", icon: MousePointer, label: "Select" },
    { mode: "text", icon: Type, label: "Text" },
    { mode: "whiteout", icon: Eraser, label: "Cover" },
    { mode: "draw", icon: Paintbrush, label: "Draw" },
    { mode: "stamp", icon: Stamp, label: "Stamp" },
    { mode: "checkmark", icon: Check, label: "Check" },
    { mode: "highlight", icon: Highlighter, label: "Highlight" },
    { mode: "shape", icon: Shapes, label: "Shape" },
    { mode: "signature", icon: PenTool, label: "Signature" },
    { mode: "sticky", icon: StickyNote, label: "Next" },
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

      <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="h-8 w-8 p-0">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="h-8 w-8 p-0">
        <Redo2 className="h-4 w-4" />
      </Button>
      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-1 flex-wrap">
        {tools.map(({ mode, icon: Icon, label }) => (
          <Button
            key={mode}
            variant={tool === mode ? "default" : "ghost"}
            size="sm"
            className="gap-1 text-xs"
            onClick={() => {
              if (mode === "sticky" && onNextAction) onNextAction();
              else setTool(mode);
            }}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </Button>
        ))}
      </div>

      {tool === "text" && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select value={textFont} onValueChange={(v) => setTextFont(v as EditorFont)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EDITOR_FONTS.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <span style={{ fontFamily: f.css }}>{f.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(fontSize)} onValueChange={(v) => setFontSize(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 60, 72].map((s) => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => onBumpFont(-2)} title="Decrease font size">A−</Button>
          <Button variant="outline" size="sm" className="h-8 px-2 text-sm font-semibold" onClick={() => onBumpFont(2)} title="Increase font size">A+</Button>
          <div className="h-6 w-px bg-border" />
          <Button variant={textBold ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={() => setTextBold(!textBold)} title="Bold">
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button variant={textItalic ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={() => setTextItalic(!textItalic)} title="Italic">
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button variant={textUnderline ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={() => setTextUnderline(!textUnderline)} title="Underline">
            <Underline className="h-3.5 w-3.5" />
          </Button>
          <Button variant={textStrike ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={() => setTextStrike(!textStrike)} title="Strikethrough">
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
          <div className="h-6 w-px bg-border" />
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Text color">
            A
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-7 w-7 rounded cursor-pointer" />
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="h-7 w-7 rounded border border-border"
                style={{ backgroundColor: textBackground === "none" ? "#ffffff" : textBackground }}
                title="Text background"
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 flex gap-1">
              {HIGHLIGHT_BG_PRESETS.map((c) => (
                <button
                  key={c.value}
                  className="h-6 w-6 rounded border border-border"
                  style={{
                    backgroundColor: c.value === "none" ? "transparent" : c.value,
                    backgroundImage: c.value === "none" ? "repeating-linear-gradient(45deg,transparent,transparent 3px,hsl(var(--muted)) 3px,hsl(var(--muted)) 6px)" : undefined,
                  }}
                  title={c.label}
                  onClick={() => setTextBackground(c.value)}
                />
              ))}
              <input type="color" value={textBackground === "none" ? "#fef08a" : textBackground} onChange={(e) => setTextBackground(e.target.value)} className="h-6 w-6 rounded" title="Custom background" />
            </PopoverContent>
          </Popover>
          <div className="h-6 w-px bg-border" />
          {([
            ["left", AlignLeft],
            ["center", AlignCenter],
            ["right", AlignRight],
          ] as const).map(([value, Icon]) => (
            <Button key={value} variant={textAlign === value ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" title={`Align ${value}`} onClick={() => setTextAlign(value)}>
              <Icon className="h-3.5 w-3.5" />
            </Button>
          ))}
          <Select value={String(lineHeight)} onValueChange={(v) => setLineHeight(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-xs" title="Line spacing"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LINE_SPACING.map((s) => (
                <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={listStyle === "bullet" ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" title="Bullets" onClick={() => setListStyle(listStyle === "bullet" ? "none" : "bullet")}>
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button variant={listStyle === "number" ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" title="Numbered list" onClick={() => setListStyle(listStyle === "number" ? "none" : "number")}>
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground max-w-40 leading-tight">Wraps inside the box. Double-click to edit.</span>
        </div>
      )}

      {(tool === "highlight" || tool === "whiteout" || tool === "shape" || tool === "draw") && (
        <span className="text-[10px] text-muted-foreground">Drag on any page to {tool === "whiteout" ? "cover" : tool}.</span>
      )}

      {tool === "signature" && (
        <span className="text-[10px] text-muted-foreground">Click the page to place a signature box. Double-click the box to draw or type a signature.</span>
      )}
      {tool === "sticky" && (
        <span className="text-[10px] text-muted-foreground">Click to drop a Next sticky note that tells people where to sign or type.</span>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-xs">More</Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2 space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={onOpenWatermark}>
            <Droplets className="h-3.5 w-3.5" /> Watermark
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={onOpenHeaderFooter}>
            <PanelTop className="h-3.5 w-3.5" /> Header & footer
          </Button>
        </PopoverContent>
      </Popover>

      {tool === "draw" && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {DRAW_INK_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                className={`h-6 w-6 rounded-full border ${drawColor === c.value ? "ring-2 ring-primary border-transparent" : "border-border"}`}
                style={{ backgroundColor: c.value }}
                onClick={() => setDrawColor(c.value)}
              />
            ))}
          </div>
          <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="h-7 w-7 rounded cursor-pointer" title="Custom ink" />
          <Label className="text-xs">Width:</Label>
          <Select value={String(strokeWidth)} onValueChange={(v) => setStrokeWidth(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 5, 8, 12].map((w) => (
                <SelectItem key={w} value={String(w)}>{w}px</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-muted-foreground">Draw, then drag, rotate, or delete the stroke.</span>
        </div>
      )}

      {tool === "whiteout" && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {COVER_FINISHES.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                className={`h-6 w-6 rounded-sm border shadow-sm ${coverColor === c.value ? "ring-2 ring-primary" : ""}`}
                style={{ backgroundColor: c.value, borderColor: c.border }}
                onClick={() => setCoverColor(c.value)}
              />
            ))}
          </div>
          <input type="color" value={coverColor} onChange={(e) => setCoverColor(e.target.value)} className="h-7 w-7 rounded cursor-pointer" title="Custom cover" />
        </div>
      )}

      {tool === "stamp" && <StampPicker selected={selectedStamp} onSelect={setSelectedStamp} />}

      {tool === "checkmark" && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {CHECK_STYLES.map((style) => (
              <Button
                key={style.id}
                variant={checkStyle === style.id ? "default" : "ghost"}
                size="sm"
                className="h-7 px-1.5 text-xs"
                title={style.label}
                onClick={() => setCheckStyle(style.id)}
              >
                {style.glyph}
              </Button>
            ))}
          </div>
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

      {tool === "shape" && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {([
              { t: "rect" as ShapeType, icon: Square, label: "Rectangle" },
              { t: "rounded" as ShapeType, icon: Radius, label: "Rounded" },
              { t: "circle" as ShapeType, icon: Circle, label: "Circle" },
              { t: "ellipse" as ShapeType, icon: Circle, label: "Ellipse" },
              { t: "line" as ShapeType, icon: Minus, label: "Line" },
              { t: "triangle" as ShapeType, icon: Triangle, label: "Triangle" },
              { t: "diamond" as ShapeType, icon: Diamond, label: "Diamond" },
              { t: "arrow" as ShapeType, icon: ArrowRight, label: "Arrow" },
            ]).map(({ t, icon: Icon, label }) => (
              <Button key={t} variant={shapeType === t ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0" title={label} onClick={() => setShapeType(t)}>
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
