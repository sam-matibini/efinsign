import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import PdfAnnotationCanvas from "@/components/PdfAnnotationCanvas";
import PdfPageThumbnails from "@/components/PdfPageThumbnails";
import PdfEditorToolbar from "@/components/pdf-editor/PdfEditorToolbar";
import AnnotationOverlay, { annotationBox } from "@/components/pdf-editor/AnnotationOverlay";
import DragDrawCanvas from "@/components/pdf-editor/DragDrawCanvas";
import TextBoxEditor from "@/components/pdf-editor/TextBoxEditor";
import { savePdfDocument } from "@/components/pdf-editor/savePdfDocument";
import type { Annotation, DrawingAnnotation, TextAnnotation, ToolMode, ShapeType, PageState, TextAlign } from "@/components/pdf-editor/types";
import { genId } from "@/components/pdf-editor/types";
import { alignRectToPage, clampRect, defaultTextBoxHeight, DEFAULT_TEXT_BOX_WIDTH, nudgeRect } from "@/lib/textLayout";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const MAX_HISTORY = 50;

export default function PdfEdit() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<PageState[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [annotations, setAnnotationsRaw] = useState<Annotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Undo/redo history
  const historyRef = useRef<Annotation[][]>([]);
  const futureRef = useRef<Annotation[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncUndoRedoState = useCallback(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const setAnnotations = useCallback((updater: Annotation[] | ((prev: Annotation[]) => Annotation[])) => {
    setAnnotationsRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Push current state to history
      historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), prev];
      futureRef.current = [];
      // Defer state sync
      setTimeout(() => syncUndoRedoState(), 0);
      return next;
    });
  }, [syncUndoRedoState]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    setAnnotationsRaw((current) => {
      futureRef.current = [...futureRef.current, current];
      const prev = historyRef.current[historyRef.current.length - 1];
      historyRef.current = historyRef.current.slice(0, -1);
      setTimeout(() => syncUndoRedoState(), 0);
      return prev;
    });
  }, [syncUndoRedoState]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setAnnotationsRaw((current) => {
      historyRef.current = [...historyRef.current, current];
      const next = futureRef.current[futureRef.current.length - 1];
      futureRef.current = futureRef.current.slice(0, -1);
      setTimeout(() => syncUndoRedoState(), 0);
      return next;
    });
  }, [syncUndoRedoState]);

  // Tool state
  const [tool, setTool] = useState<ToolMode>("select");
  const [fontSize, setFontSize] = useState(14);
  const [textAlign, setTextAlign] = useState<TextAlign>("left");
  const [drawColor, setDrawColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [checkmarkSize, setCheckmarkSize] = useState(28);
  const [highlightColor, setHighlightColor] = useState("#fde047");
  const [highlightOpacity, setHighlightOpacity] = useState(0.3);
  const [shapeType, setShapeType] = useState<ShapeType>("rect");
  const [shapeStrokeColor, setShapeStrokeColor] = useState("#000000");
  const [shapeFillColor, setShapeFillColor] = useState("none");
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [editingText, setEditingText] = useState<{
    id?: string;
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    align: TextAlign;
  } | null>(null);

  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTasksRef = useRef<Map<number, any>>(new Map());

  const pageMetrics = useCallback((pageNum: number) => {
    const c = canvasRefs.current.get(pageNum);
    return { w: c?.width || 800, h: c?.height || 1100 };
  }, []);

  const nudgeSelected = useCallback((dx: number, dy: number) => {
    if (!selectedAnnotationId || editingText) return;
    const ann = annotations.find((a) => a.id === selectedAnnotationId);
    if (!ann || !("x" in ann)) return;
    const page = pages[ann.pageIndex];
    const { w, h } = pageMetrics(page.pageNum);
    const box = annotationBox(ann);
    if (!box) return;
    const next = clampRect({ ...box, x: box.x + dx, y: box.y + dy }, w, h);
    setAnnotations((prev) => prev.map((a) => a.id === ann.id ? { ...a, x: next.x, y: next.y } as Annotation : a));
  }, [selectedAnnotationId, editingText, annotations, pages, pageMetrics, setAnnotations]);

  const alignSelectedToPage = useCallback((align: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedAnnotationId) return;
    const ann = annotations.find((a) => a.id === selectedAnnotationId);
    if (!ann || !("x" in ann)) return;
    const page = pages[ann.pageIndex];
    const { w, h } = pageMetrics(page.pageNum);
    const box = annotationBox(ann);
    if (!box) return;
    const next = alignRectToPage(box, align, w, h);
    setAnnotations((prev) => prev.map((a) => a.id === ann.id ? { ...a, x: next.x, y: next.y } as Annotation : a));
  }, [selectedAnnotationId, annotations, pages, pageMetrics, setAnnotations]);

  // Clear selection when switching tools
  useEffect(() => { setSelectedAnnotationId(null); }, [tool]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (typing || editingText || !selectedAnnotationId) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const ann = annotations.find((a) => a.id === selectedAnnotationId);
        if (!ann || !("x" in ann)) return;
        const page = pages[ann.pageIndex];
        const { w, h } = pageMetrics(page.pageNum);
        const box = annotationBox(ann);
        if (!box) return;
        const next = nudgeRect(box, e.key, e.shiftKey, w, h);
        setAnnotations((prev) => prev.map((a) => a.id === ann.id ? { ...a, x: next.x, y: next.y } as Annotation : a));
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setAnnotations((prev) => prev.filter((a) => a.id !== selectedAnnotationId));
        setSelectedAnnotationId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, editingText, selectedAnnotationId, annotations, pages, pageMetrics, setAnnotations]);

  // Load document
  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const { data } = await supabase.from("documents").select("*").eq("id", id).single();
      if (!data) { toast.error("Document not found"); navigate("/"); return; }
      setDoc(data);
      if (data.file_path) {
        const { data: urlData } = await supabase.storage.from("documents").createSignedUrl(data.file_path, 3600);
        if (urlData?.signedUrl) setPdfUrl(urlData.signedUrl);
      }
    };
    load();
  }, [id, user, navigate]);

  // Load PDF metadata (effect 1)
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;
    const loadPdf = async () => {
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      if (cancelled) { pdf.destroy(); return; }
      pdfDocRef.current = pdf;
      setPageCount(pdf.numPages);
      setPages(Array.from({ length: pdf.numPages }, (_, i) => ({ pageNum: i + 1, deleted: false })));
    };
    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  // Render pages to canvases (effect 2)
  useEffect(() => {
    const pdf = pdfDocRef.current;
    if (!pdf || pages.length === 0) return;
    let cancelled = false;

    // Cancel any in-progress render tasks
    renderTasksRef.current.forEach((task) => { try { task.cancel(); } catch {} });
    renderTasksRef.current.clear();

    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      const renderAll = async () => {
        for (const pageState of pages) {
          if (cancelled) return;
          const page = await pdf.getPage(pageState.pageNum);
          if (cancelled) return;
          const canvas = canvasRefs.current.get(pageState.pageNum);
          if (!canvas) continue;
          const viewport = page.getViewport({ scale: 1.5 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const renderTask = page.render({ canvasContext: canvas.getContext("2d")!, viewport });
          renderTasksRef.current.set(pageState.pageNum, renderTask);
          try { await renderTask.promise; } catch (e: any) {
            if (e?.name === "RenderingCancelledException") return;
          }
        }
      };
      renderAll();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      renderTasksRef.current.forEach((task) => { try { task.cancel(); } catch {} });
      renderTasksRef.current.clear();
    };
  }, [pages]);

  const handlePageClick = useCallback(
    (pageIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (pages[pageIndex]?.deleted) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (tool === "stamp" && selectedStamp) {
        setAnnotations((prev) => [...prev, { type: "stamp", id: genId(), pageIndex, x, y, label: selectedStamp }]);
      } else if (tool === "checkmark") {
        setAnnotations((prev) => [...prev, { type: "checkmark", id: genId(), pageIndex, x, y, size: checkmarkSize }]);
      } else if (tool === "image" && pendingImage) {
        setAnnotations((prev) => [...prev, { type: "image", id: genId(), pageIndex, x, y, width: 150, height: 150, imageData: pendingImage }]);
      }
    },
    [tool, selectedStamp, checkmarkSize, pendingImage, pages, setAnnotations]
  );

  const startTextBox = useCallback((pageIndex: number, x: number, y: number, width?: number, height?: number) => {
    if (pages[pageIndex]?.deleted) return;
    const page = pages[pageIndex];
    const metrics = pageMetrics(page.pageNum);
    const w = width && width > 20 ? width : DEFAULT_TEXT_BOX_WIDTH;
    const h = height && height > 20 ? height : defaultTextBoxHeight(fontSize);
    const box = clampRect({ x, y, w, h }, metrics.w, metrics.h);
    setEditingText({
      pageIndex,
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      text: "",
      align: textAlign,
    });
  }, [pages, pageMetrics, fontSize, textAlign]);

  const confirmText = useCallback(() => {
    if (!editingText) return;
    const trimmed = editingText.text.replace(/\s+$/, "");
    if (!trimmed.trim()) {
      setEditingText(null);
      return;
    }
    if (editingText.id) {
      setAnnotations((prev) => prev.map((a) => a.id === editingText.id ? {
        ...a,
        type: "text",
        x: editingText.x,
        y: editingText.y,
        width: editingText.width,
        height: editingText.height,
        text: trimmed,
        fontSize,
        align: editingText.align,
      } as TextAnnotation : a));
    } else {
      setAnnotations((prev) => [
        ...prev,
        {
          type: "text",
          id: genId(),
          pageIndex: editingText.pageIndex,
          x: editingText.x,
          y: editingText.y,
          width: editingText.width,
          height: editingText.height,
          text: trimmed,
          fontSize,
          align: editingText.align,
        },
      ]);
    }
    setTextAlign(editingText.align);
    setEditingText(null);
  }, [editingText, fontSize, setAnnotations]);

  const handleEditText = useCallback((ann: TextAnnotation) => {
    setTool("text");
    setFontSize(ann.fontSize);
    setTextAlign(ann.align ?? "left");
    setEditingText({
      id: ann.id,
      pageIndex: ann.pageIndex,
      x: ann.x,
      y: ann.y,
      width: ann.width ?? DEFAULT_TEXT_BOX_WIDTH,
      height: ann.height ?? defaultTextBoxHeight(ann.fontSize),
      text: ann.text,
      align: ann.align ?? "left",
    });
  }, []);

  const applyTextAlign = useCallback((align: TextAlign) => {
    setTextAlign(align);
    if (editingText) {
      setEditingText((prev) => prev ? { ...prev, align } : prev);
      return;
    }
    if (!selectedAnnotationId) return;
    setAnnotations((prev) => prev.map((a) => a.id === selectedAnnotationId && a.type === "text" ? { ...a, align } : a));
  }, [editingText, selectedAnnotationId, setAnnotations]);

  const applyFontSize = useCallback((size: number) => {
    setFontSize(size);
    if (!selectedAnnotationId || editingText) return;
    setAnnotations((prev) => prev.map((a) => a.id === selectedAnnotationId && a.type === "text" ? { ...a, fontSize: size } : a));
  }, [selectedAnnotationId, editingText, setAnnotations]);

  const handleDrawingComplete = useCallback((pageIndex: number, imageData: string) => {
    setAnnotations((prev) => {
      const filtered = prev.filter((a) => !(a.type === "drawing" && a.pageIndex === pageIndex));
      return [...filtered, { type: "drawing", id: genId(), pageIndex, imageData }];
    });
  }, [setAnnotations]);

  const handleHighlightComplete = useCallback((pageIndex: number, x: number, y: number, w: number, h: number) => {
    setAnnotations((prev) => [...prev, {
      type: "highlight", id: genId(), pageIndex, x, y, width: w, height: h,
      color: highlightColor, opacity: highlightOpacity,
    }]);
  }, [highlightColor, highlightOpacity, setAnnotations]);

  const handleShapeComplete = useCallback((pageIndex: number, x: number, y: number, w: number, h: number) => {
    setAnnotations((prev) => [...prev, {
      type: "shape", id: genId(), pageIndex, x, y, width: w, height: h,
      shapeType, strokeColor: shapeStrokeColor, fillColor: shapeFillColor, strokeWidth: shapeStrokeWidth,
    }]);
  }, [shapeType, shapeStrokeColor, shapeFillColor, shapeStrokeWidth, setAnnotations]);

  const handleDeleteAnnotation = useCallback((annId: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== annId));
    setSelectedAnnotationId(null);
  }, [setAnnotations]);

  const handleUpdateAnnotation = useCallback((annId: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) => prev.map((a) => a.id === annId ? { ...a, ...updates } as Annotation : a));
  }, [setAnnotations]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setPendingImage(reader.result as string); };
    reader.readAsDataURL(file);
  }, []);

  const handleReorder = useCallback((from: number, to: number) => {
    setPages((prev) => { const n = [...prev]; const [item] = n.splice(from, 1); n.splice(to, 0, item); return n; });
  }, []);
  const handleDeletePage = useCallback((i: number) => { setPages((p) => p.map((pg, idx) => idx === i ? { ...pg, deleted: true } : pg)); }, []);
  const handleRestorePage = useCallback((i: number) => { setPages((p) => p.map((pg, idx) => idx === i ? { ...pg, deleted: false } : pg)); }, []);

  const savePdf = async () => {
    if (!pdfUrl || !doc?.file_path) return;
    setSaving(true);
    try {
      const pdfBytes = await savePdfDocument(pdfUrl, pages, annotations, canvasRefs.current);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const { error } = await supabase.storage.from("documents").upload(doc.file_path, blob, { upsert: true });
      if (error) throw error;
      toast.success("PDF saved successfully");
      navigate(`/documents/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save PDF");
    } finally {
      setSaving(false);
    }
  };

  if (!doc || !pdfUrl) {
    return <div className="text-center py-12 text-muted-foreground">Loading document...</div>;
  }

  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId) ?? null;

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
      <PdfEditorToolbar
        docTitle={doc.title}
        tool={tool} setTool={setTool}
        fontSize={fontSize} setFontSize={applyFontSize}
        drawColor={drawColor} setDrawColor={setDrawColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
        selectedStamp={selectedStamp} setSelectedStamp={setSelectedStamp}
        checkmarkSize={checkmarkSize} setCheckmarkSize={setCheckmarkSize}
        highlightColor={highlightColor} setHighlightColor={setHighlightColor}
        highlightOpacity={highlightOpacity} setHighlightOpacity={setHighlightOpacity}
        shapeType={shapeType} setShapeType={setShapeType}
        shapeStrokeColor={shapeStrokeColor} setShapeStrokeColor={setShapeStrokeColor}
        shapeFillColor={shapeFillColor} setShapeFillColor={setShapeFillColor}
        shapeStrokeWidth={shapeStrokeWidth} setShapeStrokeWidth={setShapeStrokeWidth}
        onImageUpload={handleImageUpload}
        saving={saving} onSave={savePdf}
        onBack={() => navigate(`/documents/${id}`)}
        onUndo={undo} onRedo={redo}
        canUndo={canUndo} canRedo={canRedo}
        textAlign={textAlign}
        setTextAlign={applyTextAlign}
        selectedAnnotation={selectedAnnotation}
        onNudgeSelected={nudgeSelected}
        onAlignSelectedToPage={alignSelectedToPage}
      />

      <div className="flex flex-1 min-h-0">
        <div className="w-40 border-r border-border/50 bg-card/30 shrink-0 overflow-y-auto">
          <PdfPageThumbnails
            pages={pages}
            onReorder={handleReorder}
            onDelete={handleDeletePage}
            onRestore={handleRestorePage}
            activePageIndex={activePageIndex}
            onSelect={setActivePageIndex}
          />
        </div>

        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          <div className="flex flex-col items-center gap-4">
            {pages.map((pageState, index) => {
              if (pageState.deleted) return null;
              const drawingAnn = annotations.find((a) => a.type === "drawing" && a.pageIndex === index) as DrawingAnnotation | undefined;
              return (
                <div
                  key={`${pageState.pageNum}-${index}`}
                  className={`relative inline-block shadow-md ${activePageIndex === index ? "ring-2 ring-primary" : ""}`}
                  onClick={(e) => {
                    if (editingText) confirmText();
                    handlePageClick(index, e);
                  }}
                  style={{ cursor: tool === "text" || tool === "stamp" || tool === "checkmark" || tool === "image" ? "crosshair" : undefined }}
                >
                  <canvas
                    ref={(el) => { if (el) canvasRefs.current.set(pageState.pageNum, el); else canvasRefs.current.delete(pageState.pageNum); }}
                    style={{ display: "block" }}
                  />

                  {tool === "draw" && (
                    <PdfAnnotationCanvas
                      width={canvasRefs.current.get(pageState.pageNum)?.width || 800}
                      height={canvasRefs.current.get(pageState.pageNum)?.height || 1100}
                      color={drawColor}
                      strokeWidth={strokeWidth}
                      active={activePageIndex === index}
                      existingDrawing={drawingAnn?.imageData}
                      onDrawingComplete={(data) => handleDrawingComplete(index, data)}
                    />
                  )}

                  <DragDrawCanvas
                    active={tool === "highlight" && activePageIndex === index}
                    onComplete={(x, y, w, h) => handleHighlightComplete(index, x, y, w, h)}
                    previewColor={highlightColor}
                    previewOpacity={highlightOpacity}
                  />

                  <DragDrawCanvas
                    active={tool === "shape" && activePageIndex === index}
                    onComplete={(x, y, w, h) => handleShapeComplete(index, x, y, w, h)}
                    previewColor={shapeStrokeColor}
                    previewOpacity={0.2}
                  />

                  <DragDrawCanvas
                    active={tool === "text" && !editingText}
                    onComplete={(x, y, w, h) => startTextBox(index, x, y, w, h)}
                    onPoint={(x, y) => startTextBox(index, x, y)}
                    previewColor="#3b82f6"
                    previewOpacity={0.12}
                  />

                  <AnnotationOverlay
                    annotations={annotations}
                    pageIndex={index}
                    tool={tool}
                    selectedId={selectedAnnotationId}
                    hiddenId={editingText?.id ?? null}
                    onSelect={setSelectedAnnotationId}
                    onDelete={handleDeleteAnnotation}
                    onUpdate={handleUpdateAnnotation}
                    onEditText={handleEditText}
                  />

                  {editingText?.pageIndex === index && (
                    <TextBoxEditor
                      x={editingText.x}
                      y={editingText.y}
                      width={editingText.width}
                      height={editingText.height}
                      text={editingText.text}
                      fontSize={fontSize}
                      align={editingText.align}
                      pageWidth={pageMetrics(pageState.pageNum).w}
                      pageHeight={pageMetrics(pageState.pageNum).h}
                      otherRects={annotations
                        .filter((a) => a.pageIndex === index && a.id !== editingText.id)
                        .map(annotationBox)
                        .filter((r): r is NonNullable<typeof r> => r !== null)}
                      onChange={(next) => setEditingText((prev) => prev ? { ...prev, ...next } : prev)}
                      onCommit={confirmText}
                      onCancel={() => setEditingText(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
