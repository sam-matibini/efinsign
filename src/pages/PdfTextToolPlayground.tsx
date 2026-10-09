import { useMemo, useState } from "react";
import PdfEditorToolbar from "@/components/pdf-editor/PdfEditorToolbar";
import AnnotationOverlay, { annotationBox } from "@/components/pdf-editor/AnnotationOverlay";
import DragDrawCanvas from "@/components/pdf-editor/DragDrawCanvas";
import TextBoxEditor from "@/components/pdf-editor/TextBoxEditor";
import type { Annotation, TextAlign, TextAnnotation, ToolMode } from "@/components/pdf-editor/types";
import { genId } from "@/components/pdf-editor/types";
import { alignRectToPage, clampRect, defaultTextBoxHeight, DEFAULT_TEXT_BOX_WIDTH } from "@/lib/textLayout";

const PAGE_W = 720;
const PAGE_H = 960;

/** Dev-only canvas to exercise wrapping, dragging, snapping, and alignment. */
export default function PdfTextToolPlayground() {
  const [tool, setTool] = useState<ToolMode>("text");
  const [fontSize, setFontSize] = useState(14);
  const [textAlign, setTextAlign] = useState<TextAlign>("left");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id?: string;
    x: number; y: number; width: number; height: number;
    text: string; align: TextAlign;
  } | null>(null);

  const selected = annotations.find((a) => a.id === selectedId) ?? null;

  const startBox = (x: number, y: number, width?: number, height?: number) => {
    const w = width && width > 20 ? width : DEFAULT_TEXT_BOX_WIDTH;
    const h = height && height > 20 ? height : defaultTextBoxHeight(fontSize);
    const box = clampRect({ x, y, w, h }, PAGE_W, PAGE_H);
    setEditing({ ...box, width: box.w, height: box.h, text: "", align: textAlign });
  };

  const commit = () => {
    if (!editing) return;
    const text = editing.text.replace(/\s+$/, "");
    if (!text.trim()) { setEditing(null); return; }
    if (editing.id) {
      setAnnotations((prev) => prev.map((a) => a.id === editing.id ? {
        ...a, type: "text", x: editing.x, y: editing.y, width: editing.width, height: editing.height, text, fontSize, align: editing.align,
      } as TextAnnotation : a));
    } else {
      setAnnotations((prev) => [...prev, {
        type: "text", id: genId(), pageIndex: 0, x: editing.x, y: editing.y, width: editing.width, height: editing.height, text, fontSize, align: editing.align,
      }]);
    }
    setTextAlign(editing.align);
    setEditing(null);
  };

  const dummy = useMemo(() => ({
    setDrawColor: () => {}, setStrokeWidth: () => {}, setSelectedStamp: () => {},
    setCheckmarkSize: () => {}, setHighlightColor: () => {}, setHighlightOpacity: () => {},
    setShapeType: () => {}, setShapeStrokeColor: () => {}, setShapeFillColor: () => {},
    setShapeStrokeWidth: () => {}, onImageUpload: () => {},
  }), []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PdfEditorToolbar
        docTitle="Text tool playground"
        tool={tool} setTool={setTool}
        fontSize={fontSize} setFontSize={setFontSize}
        drawColor="#000" setDrawColor={dummy.setDrawColor}
        strokeWidth={3} setStrokeWidth={dummy.setStrokeWidth}
        selectedStamp={null} setSelectedStamp={dummy.setSelectedStamp}
        checkmarkSize={28} setCheckmarkSize={dummy.setCheckmarkSize}
        highlightColor="#fde047" setHighlightColor={dummy.setHighlightColor}
        highlightOpacity={0.3} setHighlightOpacity={dummy.setHighlightOpacity}
        shapeType="rect" setShapeType={dummy.setShapeType}
        shapeStrokeColor="#000" setShapeStrokeColor={dummy.setShapeStrokeColor}
        shapeFillColor="none" setShapeFillColor={dummy.setShapeFillColor}
        shapeStrokeWidth={2} setShapeStrokeWidth={dummy.setShapeStrokeWidth}
        onImageUpload={dummy.onImageUpload}
        saving={false} onSave={() => {}}
        onBack={() => {}} onUndo={() => {}} onRedo={() => {}}
        canUndo={false} canRedo={false}
        textAlign={textAlign}
        setTextAlign={(a) => {
          setTextAlign(a);
          if (editing) setEditing((p) => p ? { ...p, align: a } : p);
          else if (selectedId) setAnnotations((prev) => prev.map((ann) => ann.id === selectedId && ann.type === "text" ? { ...ann, align: a } : ann));
        }}
        selectedAnnotation={selected}
        onNudgeSelected={(dx, dy) => {
          if (!selected || !("x" in selected)) return;
          const box = annotationBox(selected);
          if (!box) return;
          const next = clampRect({ ...box, x: box.x + dx, y: box.y + dy }, PAGE_W, PAGE_H);
          setAnnotations((prev) => prev.map((a) => a.id === selected.id ? { ...a, x: next.x, y: next.y } as Annotation : a));
        }}
        onAlignSelectedToPage={(align) => {
          if (!selected || !("x" in selected)) return;
          const box = annotationBox(selected);
          if (!box) return;
          const next = alignRectToPage(box, align, PAGE_W, PAGE_H);
          setAnnotations((prev) => prev.map((a) => a.id === selected.id ? { ...a, x: next.x, y: next.y } as Annotation : a));
        }}
      />
      <div className="flex-1 overflow-auto p-6 bg-muted/40 flex justify-center">
        <div
          className="relative bg-white shadow-md"
          style={{ width: PAGE_W, height: PAGE_H }}
          onClick={() => { if (editing) commit(); }}
        >
          <div className="absolute inset-6 border border-border">
            <p className="text-sm text-muted-foreground p-3">Sample form field. Add wrapping text, then drag, nudge, or snap it to the edges.</p>
          </div>
          <DragDrawCanvas
            active={tool === "text" && !editing}
            onComplete={(x, y, w, h) => startBox(x, y, w, h)}
            onPoint={(x, y) => startBox(x, y)}
            previewColor="#3b82f6"
            previewOpacity={0.12}
          />
          <AnnotationOverlay
            annotations={annotations}
            pageIndex={0}
            tool={tool}
            selectedId={selectedId}
            hiddenId={editing?.id ?? null}
            onSelect={setSelectedId}
            onDelete={(id) => setAnnotations((prev) => prev.filter((a) => a.id !== id))}
            onUpdate={(id, updates) => setAnnotations((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } as Annotation : a))}
            onEditText={(ann) => {
              setTool("text");
              setFontSize(ann.fontSize);
              setTextAlign(ann.align ?? "left");
              setEditing({
                id: ann.id, x: ann.x, y: ann.y,
                width: ann.width ?? DEFAULT_TEXT_BOX_WIDTH,
                height: ann.height ?? defaultTextBoxHeight(ann.fontSize),
                text: ann.text, align: ann.align ?? "left",
              });
            }}
          />
          {editing && (
            <TextBoxEditor
              x={editing.x} y={editing.y} width={editing.width} height={editing.height}
              text={editing.text} fontSize={fontSize} align={editing.align}
              pageWidth={PAGE_W} pageHeight={PAGE_H}
              otherRects={annotations.filter((a) => a.id !== editing.id).map(annotationBox).filter((r): r is NonNullable<typeof r> => r !== null)}
              onChange={(next) => setEditing((p) => p ? { ...p, ...next } : p)}
              onCommit={commit}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
