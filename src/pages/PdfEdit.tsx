import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import PdfAnnotationCanvas from "@/components/PdfAnnotationCanvas";
import PdfPageThumbnails from "@/components/PdfPageThumbnails";
import PdfEditorToolbar from "@/components/pdf-editor/PdfEditorToolbar";
import AnnotationOverlay from "@/components/pdf-editor/AnnotationOverlay";
import DragDrawCanvas from "@/components/pdf-editor/DragDrawCanvas";
import { savePdfDocument } from "@/components/pdf-editor/savePdfDocument";
import { saveEditedPdfBlob } from "@/lib/saveEditedPdf";
import TextBoxEditor from "@/components/pdf-editor/TextBoxEditor";
import type { Annotation, DrawingAnnotation, EditorFont, ListStyle, TextAlign, TextAnnotation, ToolMode, ShapeType, PageState, SignatureAnnotation, StickyNoteAnnotation } from "@/components/pdf-editor/types";
import { genId } from "@/components/pdf-editor/types";
import { DEFAULT_TEXT_BOX_WIDTH, estimateWrappedHeight } from "@/lib/textWrap";
import { defaultTextBoxHeight, nudgeRect } from "@/lib/textLayout";
import { editorFontCss } from "@/lib/editorFonts";
import { textAnnotationFromEditor, withPendingText } from "@/lib/pendingText";
import type { CheckStyle } from "@/lib/checkStyles";
import { sealByStampLabel } from "@/lib/companySeals";
import PageDemarcator from "@/components/PageDemarcator";
import SignatureCapture from "@/components/SignatureCapture";
import { Textarea } from "@/components/ui/textarea";

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
  const [textColor, setTextColor] = useState("#111827");
  const [textBackground, setTextBackground] = useState("none");
  const [textFont, setTextFont] = useState<EditorFont>("helvetica");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textStrike, setTextStrike] = useState(false);
  const [textAlign, setTextAlign] = useState<TextAlign>("left");
  const [lineHeight, setLineHeight] = useState(1.15);
  const [listStyle, setListStyle] = useState<ListStyle>("none");
  const [signatureTargetId, setSignatureTargetId] = useState<string | null>(null);
  const [stickyEditor, setStickyEditor] = useState<{ id: string; text: string } | null>(null);
  const [drawColor, setDrawColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [checkmarkSize, setCheckmarkSize] = useState(28);
  const [checkStyle, setCheckStyle] = useState<CheckStyle>("check");
  const [highlightColor, setHighlightColor] = useState("#fde047");
  const [highlightOpacity, setHighlightOpacity] = useState(0.3);
  const [shapeType, setShapeType] = useState<ShapeType>("rect");
  const [shapeStrokeColor, setShapeStrokeColor] = useState("#000000");
  const [shapeFillColor, setShapeFillColor] = useState("none");
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [editingText, setEditingText] = useState<{
    pageIndex: number;
    x: number;
    y: number;
    id?: string;
    width?: number;
    height?: number;
    align?: TextAlign;
  } | null>(null);
  const [textValue, setTextValue] = useState("");
  const [watermarkOpen, setWatermarkOpen] = useState(false);
  const [watermarkText, setWatermarkText] = useState("DRAFT");
  const [headerFooterOpen, setHeaderFooterOpen] = useState(false);
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");

  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTasksRef = useRef<Map<number, any>>(new Map());

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
        setAnnotations((prev) => prev.map((ann) => {
          if (ann.id !== selectedAnnotationId || !("x" in ann)) return ann;
          const next = nudgeRect(
            { x: ann.x, y: ann.y, w: ("width" in ann && ann.width) ? ann.width : 40, h: ("height" in ann && ann.height) ? ann.height : 24 },
            e.key,
            e.shiftKey,
            4000,
            4000,
          );
          return { ...ann, x: next.x, y: next.y };
        }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, editingText, selectedAnnotationId, setAnnotations]);

  // Clear selection when switching tools
  useEffect(() => { setSelectedAnnotationId(null); }, [tool]);

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

      if (tool === "text") {
        setEditingText({
          pageIndex, x, y,
          width: DEFAULT_TEXT_BOX_WIDTH,
          height: defaultTextBoxHeight(fontSize),
          align: textAlign,
        });
        setTextValue("");
      } else if (tool === "signature") {
        const id = genId();
        setAnnotations((prev) => [...prev, {
          type: "signature", id, pageIndex, x, y, width: 220, height: 72,
        }]);
        setSelectedAnnotationId(id);
        setSignatureTargetId(id);
      } else if (tool === "sticky") {
        const id = genId();
        setAnnotations((prev) => [...prev, {
          type: "sticky",
          id,
          pageIndex,
          x,
          y,
          width: 170,
          height: 92,
          text: "Sign or complete the next action here.",
          color: "#fde047",
        }]);
        setSelectedAnnotationId(id);
      } else if (tool === "stamp" && selectedStamp) {
        const seal = sealByStampLabel(selectedStamp);
        setAnnotations((prev) => [...prev, {
          type: "stamp", id: genId(), pageIndex, x, y, label: selectedStamp,
          ...(seal ? { width: 150, height: 150 } : {}),
        }]);
      } else if (tool === "checkmark") {
        setAnnotations((prev) => [...prev, { type: "checkmark", id: genId(), pageIndex, x, y, size: checkmarkSize, style: checkStyle }]);
      } else if (tool === "image" && pendingImage) {
        setAnnotations((prev) => [...prev, { type: "image", id: genId(), pageIndex, x, y, width: 150, height: 150, imageData: pendingImage }]);
      }
    },
    [tool, selectedStamp, checkmarkSize, checkStyle, pendingImage, pages, setAnnotations, fontSize, textAlign]
  );

  const handleNextAction = useCallback(() => {
    const hasSig = annotations.some((a) => a.type === "signature");
    const nextTool = hasSig ? "text" : "signature";
    const note = hasSig ? "Next — add or edit text here." : "Next — add your signature here.";
    setTool(nextTool);
    setAnnotations((prev) => [...prev, {
      type: "sticky",
      id: genId(),
      pageIndex: activePageIndex,
      x: 36,
      y: 36,
      width: 180,
      height: 90,
      text: note,
      color: "#fde047",
    }]);
    toast.message(hasSig ? "Next: add text on the page" : "Next: place your signature");
  }, [activePageIndex, annotations, setAnnotations]);

  const textCommitRef = useRef(false);
  const pendingTextAnnotation = useCallback(() => {
    if (!editingText) return null;
    return textAnnotationFromEditor({
      ...editingText,
      text: textValue,
      fontSize,
      color: textColor,
      backgroundColor: textBackground,
      fontFamily: textFont,
      bold: textBold,
      italic: textItalic,
      underline: textUnderline,
      strikethrough: textStrike,
      lineHeight,
      listStyle,
    });
  }, [editingText, textValue, fontSize, textColor, textBackground, textFont, textBold, textItalic, textUnderline, textStrike, lineHeight, listStyle]);

  const confirmText = useCallback(() => {
    if (textCommitRef.current) return;
    const next = pendingTextAnnotation();
    if (!next) { setEditingText(null); return; }
    textCommitRef.current = true;
    setTimeout(() => { textCommitRef.current = false; }, 0);
    setAnnotations((prev) => withPendingText(prev, next));
    setEditingText(null);
    setTextValue("");
  }, [pendingTextAnnotation, setAnnotations]);

  const handleEditText = useCallback((ann: TextAnnotation) => {
    setTool("select");
    setFontSize(ann.fontSize);
    if (ann.color) setTextColor(ann.color);
    setTextBackground(ann.backgroundColor || "none");
    if (ann.fontFamily) setTextFont(ann.fontFamily);
    setTextBold(!!ann.bold);
    setTextItalic(!!ann.italic);
    setTextUnderline(!!ann.underline);
    setTextStrike(!!ann.strikethrough);
    setTextAlign(ann.align ?? "left");
    setLineHeight(ann.lineHeight ?? 1.15);
    setListStyle(ann.listStyle ?? "none");
    setTextValue(ann.text);
    setEditingText({
      pageIndex: ann.pageIndex,
      x: ann.x,
      y: ann.y,
      id: ann.id,
      width: ann.width,
      height: ann.height,
      align: ann.align ?? "left",
    });
  }, []);

  const patchSelectedText = useCallback((patch: Partial<TextAnnotation>) => {
    if (!selectedAnnotationId) return;
    setAnnotations((prev) => prev.map((a) => (
      a.id === selectedAnnotationId && a.type === "text" ? { ...a, ...patch } : a
    )));
    if (editingText && patch.align) {
      setEditingText((prev) => prev ? { ...prev, align: patch.align } : prev);
    }
  }, [editingText, selectedAnnotationId, setAnnotations]);

  const applyWatermark = useCallback(() => {
    const label = watermarkText.trim();
    if (!label) { toast.error("Enter watermark text"); return; }
    const additions: TextAnnotation[] = pages
      .map((page, index) => page.deleted ? null : ({
        type: "text" as const,
        id: genId(),
        pageIndex: index,
        x: 140,
        y: 420,
        text: label,
        fontSize: 48,
        width: 460,
        height: 72,
        color: "#94a3b8",
        fontFamily: "helvetica" as const,
        bold: true,
        opacity: 0.28,
        rotate: -28,
      }))
      .filter((a): a is TextAnnotation => a !== null);
    setAnnotations((prev) => [...prev, ...additions]);
    setWatermarkOpen(false);
    toast.success("Watermark added. Drag it if you want it somewhere else.");
  }, [watermarkText, pages, setAnnotations]);

  const applyHeaderFooter = useCallback(() => {
    if (!headerText.trim() && !footerText.trim()) { toast.error("Enter a header or a footer"); return; }
    const additions: TextAnnotation[] = [];
    pages.forEach((page, index) => {
      if (page.deleted) return;
      const canvas = canvasRefs.current.get(page.pageNum);
      const pageWidth = canvas?.width || 900;
      const pageHeight = canvas?.height || 1200;
      const width = Math.max(160, pageWidth - 72);
      if (headerText.trim()) {
        additions.push({
          type: "text", id: genId(), pageIndex: index, x: 36, y: 16,
          text: headerText.trim(), fontSize: 11, width, height: 22,
          color: "#334155", fontFamily: textFont, bold: textBold,
        });
      }
      if (footerText.trim()) {
        additions.push({
          type: "text", id: genId(), pageIndex: index, x: 36, y: Math.max(16, pageHeight - 32),
          text: footerText.trim(), fontSize: 11, width, height: 22,
          color: "#334155", fontFamily: textFont, bold: textBold,
        });
      }
    });
    setAnnotations((prev) => [...prev, ...additions]);
    setHeaderFooterOpen(false);
    toast.success("Header and footer added to each page");
  }, [headerText, footerText, pages, textFont, textBold, setAnnotations]);

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

  const handleWhiteoutComplete = useCallback((pageIndex: number, x: number, y: number, w: number, h: number) => {
    setAnnotations((prev) => [...prev, { type: "whiteout", id: genId(), pageIndex, x, y, width: w, height: h }]);
  }, [setAnnotations]);

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
      const pending = pendingTextAnnotation();
      const toEmbed = withPendingText(annotations, pending);
      if (pending) {
        setAnnotations((prev) => withPendingText(prev, pending));
        setEditingText(null);
        setTextValue("");
      }
      const pdfBytes = await savePdfDocument(pdfUrl, pages, toEmbed, canvasRefs.current);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      await saveEditedPdfBlob(doc.id, doc.file_path, blob, {
        organizationId: doc.organization_id,
        userId: user?.id,
      });
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

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
      <PdfEditorToolbar
        docTitle={doc.title}
        tool={tool} setTool={setTool}
        fontSize={fontSize} setFontSize={setFontSize}
        textColor={textColor} setTextColor={(c) => { setTextColor(c); patchSelectedText({ color: c }); }}
        textBackground={textBackground} setTextBackground={(c) => { setTextBackground(c); patchSelectedText({ backgroundColor: c === "none" ? undefined : c }); }}
        textFont={textFont} setTextFont={(f) => { setTextFont(f); patchSelectedText({ fontFamily: f }); }}
        textBold={textBold} setTextBold={(b) => { setTextBold(b); patchSelectedText({ bold: b }); }}
        textItalic={textItalic} setTextItalic={(b) => { setTextItalic(b); patchSelectedText({ italic: b }); }}
        textUnderline={textUnderline} setTextUnderline={(b) => { setTextUnderline(b); patchSelectedText({ underline: b }); }}
        textStrike={textStrike} setTextStrike={(b) => { setTextStrike(b); patchSelectedText({ strikethrough: b }); }}
        textAlign={textAlign} setTextAlign={(a) => { setTextAlign(a); patchSelectedText({ align: a }); setEditingText((prev) => prev ? { ...prev, align: a } : prev); }}
        lineHeight={lineHeight} setLineHeight={(n) => { setLineHeight(n); patchSelectedText({ lineHeight: n }); }}
        listStyle={listStyle} setListStyle={(s) => { setListStyle(s); patchSelectedText({ listStyle: s }); }}
        drawColor={drawColor} setDrawColor={setDrawColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
        selectedStamp={selectedStamp} setSelectedStamp={setSelectedStamp}
        checkmarkSize={checkmarkSize} setCheckmarkSize={setCheckmarkSize}
        checkStyle={checkStyle} setCheckStyle={setCheckStyle}
        onBumpFont={(delta) => {
          setFontSize((size) => Math.min(72, Math.max(8, size + delta)));
          if (!selectedAnnotationId) return;
          setAnnotations((prev) => prev.map((ann) => {
            if (ann.id !== selectedAnnotationId || ann.type !== "text") return ann;
            const fontSizeNext = Math.min(72, Math.max(8, ann.fontSize + delta));
            return { ...ann, fontSize: fontSizeNext, height: estimateWrappedHeight(ann.text, fontSizeNext, ann.width || DEFAULT_TEXT_BOX_WIDTH) };
          }));
        }}
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
        onOpenWatermark={() => setWatermarkOpen(true)}
        onOpenHeaderFooter={() => setHeaderFooterOpen(true)}
        onNextAction={handleNextAction}
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
              const visiblePage = pages.slice(0, index + 1).filter((p) => !p.deleted).length;
              const visibleTotal = pages.filter((p) => !p.deleted).length;
              const nextPage = pages.findIndex((p, i) => i > index && !p.deleted);
              return (
                <div key={`${pageState.pageNum}-${index}`} className="flex flex-col items-center">
                <div
                  data-editor-page={index}
                  className={`relative inline-block shadow-md ${activePageIndex === index ? "ring-2 ring-primary" : ""}`}
                  onClick={(e) => handlePageClick(index, e)}
                  style={{ cursor: tool === "text" || tool === "stamp" || tool === "checkmark" || tool === "image" || tool === "signature" || tool === "sticky" ? "crosshair" : undefined }}
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
                    active={tool === "whiteout" && activePageIndex === index}
                    onComplete={(x, y, w, h) => handleWhiteoutComplete(index, x, y, w, h)}
                    previewColor="#ffffff"
                    previewOpacity={0.85}
                  />

                  <DragDrawCanvas
                    active={tool === "shape" && activePageIndex === index}
                    onComplete={(x, y, w, h) => handleShapeComplete(index, x, y, w, h)}
                    previewColor={shapeStrokeColor}
                    previewOpacity={0.2}
                  />

                  <AnnotationOverlay
                    annotations={annotations}
                    pageIndex={index}
                    tool={tool}
                    selectedId={selectedAnnotationId}
                    onSelect={setSelectedAnnotationId}
                    onDelete={handleDeleteAnnotation}
                    onUpdate={handleUpdateAnnotation}
                    onEditText={handleEditText}
                    onEditSignature={(ann) => setSignatureTargetId(ann.id)}
                    onEditSticky={(ann) => setStickyEditor({ id: ann.id, text: ann.text })}
                  />

                  {editingText?.pageIndex === index && (
                    <TextBoxEditor
                      x={editingText.x}
                      y={editingText.y}
                      width={editingText.width || DEFAULT_TEXT_BOX_WIDTH}
                      height={editingText.height || defaultTextBoxHeight(fontSize)}
                      text={textValue}
                      fontSize={fontSize}
                      align={editingText.align ?? textAlign}
                      color={textColor}
                      backgroundColor={textBackground}
                      fontFamily={editorFontCss(textFont)}
                      bold={textBold}
                      italic={textItalic}
                      underline={textUnderline}
                      strikethrough={textStrike}
                      lineHeight={lineHeight}
                      pageWidth={canvasRefs.current.get(pageState.pageNum)?.width || 900}
                      pageHeight={canvasRefs.current.get(pageState.pageNum)?.height || 1200}
                      otherRects={annotations
                        .filter((a) => a.pageIndex === index && a.id !== editingText.id && a.type !== "drawing")
                        .flatMap((a) => ("x" in a && "y" in a)
                          ? [{ x: a.x, y: a.y, w: ("width" in a && a.width) ? a.width : 40, h: ("height" in a && a.height) ? a.height : 24 }]
                          : [])}
                      onChange={(next) => {
                        setTextValue(next.text);
                        setEditingText((prev) => prev ? { ...prev, ...next } : prev);
                      }}
                      onCommit={confirmText}
                      onCancel={() => { setEditingText(null); setTextValue(""); }}
                      onDelete={() => {
                        if (editingText.id) handleDeleteAnnotation(editingText.id);
                        setEditingText(null);
                        setTextValue("");
                      }}
                    />
                  )}
                </div>
                <PageDemarcator
                  page={visiblePage}
                  total={visibleTotal}
                  nextLabel="Next page"
                  onNext={nextPage >= 0 ? () => {
                    setActivePageIndex(nextPage);
                    document.querySelector(`[data-editor-page="${nextPage}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  } : undefined}
                />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={watermarkOpen} onOpenChange={setWatermarkOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Watermark</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Text shown across every page</Label>
            <Input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWatermarkOpen(false)}>Cancel</Button>
            <Button onClick={applyWatermark}>Add watermark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!signatureTargetId} onOpenChange={(open) => { if (!open) setSignatureTargetId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add signature</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Draw or type a signature into the box you placed. Cancel to leave the empty sign-here space.</p>
          <SignatureCapture
            saveLabel="Place signature"
            onSave={(imageData) => {
              if (signatureTargetId) {
                handleUpdateAnnotation(signatureTargetId, { imageData } as Partial<SignatureAnnotation>);
              }
              setSignatureTargetId(null);
            }}
            onCancel={() => setSignatureTargetId(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!stickyEditor} onOpenChange={(open) => { if (!open) setStickyEditor(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Next sticky note</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Guide people to the next action</Label>
            <Textarea
              value={stickyEditor?.text ?? ""}
              onChange={(e) => setStickyEditor((prev) => prev ? { ...prev, text: e.target.value } : prev)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStickyEditor(null)}>Cancel</Button>
            <Button onClick={() => {
              if (stickyEditor) handleUpdateAnnotation(stickyEditor.id, { text: stickyEditor.text } as Partial<StickyNoteAnnotation>);
              setStickyEditor(null);
            }}>Update note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={headerFooterOpen} onOpenChange={setHeaderFooterOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Header & footer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Header</Label>
              <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Optional header" />
            </div>
            <div className="space-y-1">
              <Label>Footer</Label>
              <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Optional footer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeaderFooterOpen(false)}>Cancel</Button>
            <Button onClick={applyHeaderFooter}>Add to pages</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
