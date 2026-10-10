import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Printer,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageDemarcator from "@/components/PageDemarcator";
import { resolveZoomPercent, stepZoom, type ZoomMode } from "@/lib/previewZoom";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  className?: string;
  placementMode?: boolean;
  onPageClick?: (pageNumber: number, x: number, y: number) => void;
  onPageDrop?: (pageNumber: number, x: number, y: number, fieldType: string, sealLabel?: string) => void;
  renderPageOverlay?: (pageNumber: number) => React.ReactNode;
  onNextFromPage?: (pageNumber: number) => void;
  nextTagLabel?: string;
  showChrome?: boolean;
  fileName?: string;
}

export default function PdfViewer({
  url,
  className = "",
  placementMode = false,
  onPageClick,
  onPageDrop,
  renderPageOverlay,
  onNextFromPage,
  nextTagLabel,
  showChrome = true,
  fileName = "document.pdf",
}: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pageSizes, setPageSizes] = useState<Map<number, { width: number; height: number }>>(new Map());
  const [container, setContainer] = useState({ width: 960, height: 720 });
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-width");
  const [customZoom, setCustomZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [findQuery, setFindQuery] = useState("");
  const [findHits, setFindHits] = useState<number[]>([]);
  const [findIndex, setFindIndex] = useState(0);
  const [finding, setFinding] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const firstPage = pageSizes.get(1) || { width: 918, height: 1188 };
  const zoomPercent = resolveZoomPercent(zoomMode, customZoom, container, firstPage);
  const cssScale = zoomPercent / 100;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setPageCount(0);
    setPageSizes(new Map());
    setError(null);
    const loadPdf = async () => {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) { pdf.destroy(); return; }
        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load PDF");
      }
    };
    loadPdf();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    const pdf = pdfDocRef.current;
    if (!pdf || pageCount === 0) return;
    let cancelled = false;

    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      const renderAll = async () => {
        const sizes = new Map<number, { width: number; height: number }>();
        for (let i = 1; i <= pageCount; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const canvas = canvasRefs.current.get(i);
          if (!canvas) continue;
          const viewport = page.getViewport({ scale: 1.5 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          sizes.set(i, { width: viewport.width, height: viewport.height });
          try {
            await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          } catch (e: any) {
            if (e?.name === "RenderingCancelledException") return;
          }
        }
        if (!cancelled) setPageSizes(sizes);
      };
      renderAll();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [pageCount, url]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setContainer({ width: el.clientWidth || 960, height: el.clientHeight || 720 });
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || pageCount === 0) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const page = visible?.target.getAttribute("data-page");
      if (page) setCurrentPage(Number(page));
    }, { root, threshold: [0.35, 0.55, 0.75] });
    root.querySelectorAll("[data-page]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pageCount, cssScale]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const goToPage = useCallback((page: number) => {
    const next = Math.min(pageCount, Math.max(1, page));
    setCurrentPage(next);
    document.querySelector(`[data-page="${next}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pageCount]);

  const handlePageClick = useCallback(
    (pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementMode || !onPageClick) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const size = pageSizes.get(pageNumber);
      const scaleX = size ? size.width / rect.width : 1;
      const scaleY = size ? size.height / rect.height : 1;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      onPageClick(pageNumber, Math.round(x), Math.round(y));
    },
    [placementMode, onPageClick, pageSizes],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (pageNumber: number, e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fieldType = e.dataTransfer.getData("fieldType");
      if (!fieldType || !onPageDrop) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const size = pageSizes.get(pageNumber);
      const scaleX = size ? size.width / rect.width : 1;
      const scaleY = size ? size.height / rect.height : 1;
      onPageDrop(
        pageNumber,
        Math.round((e.clientX - rect.left) * scaleX),
        Math.round((e.clientY - rect.top) * scaleY),
        fieldType,
        e.dataTransfer.getData("sealLabel") || undefined,
      );
    },
    [onPageDrop, pageSizes],
  );

  const applyCustomZoom = (percent: number) => {
    setZoomMode("custom");
    setCustomZoom(percent);
  };

  const runFind = async () => {
    const pdf = pdfDocRef.current;
    const q = findQuery.trim().toLowerCase();
    if (!pdf || !q) { setFindHits([]); return; }
    setFinding(true);
    try {
      const hits: number[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
        if (text.toLowerCase().includes(q)) hits.push(i);
      }
      setFindHits(hits);
      setFindIndex(0);
      if (hits[0]) goToPage(hits[0]);
    } finally {
      setFinding(false);
    }
  };

  const nextFind = () => {
    if (findHits.length === 0) return;
    const next = (findIndex + 1) % findHits.length;
    setFindIndex(next);
    goToPage(findHits[next]);
  };

  const download = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    link.click();
  };

  const print = () => {
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.src = url;
    frame.onload = () => {
      try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch { /* ignore */ }
    };
    document.body.appendChild(frame);
  };

  const toggleFullscreen = async () => {
    if (!rootRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await rootRef.current.requestFullscreen();
  };

  const zoomLabel = useMemo(() => {
    if (zoomMode === "fit-width") return "Fit width";
    if (zoomMode === "fit-page") return "Fit page";
    return `${Math.round(zoomPercent)}%`;
  }, [zoomMode, zoomPercent]);

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className}`}>
        <p>Failed to load PDF: {error}</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`flex flex-col min-h-0 bg-muted/40 ${className}`}>
      {showChrome && (
        <div className="shrink-0 flex flex-wrap items-center gap-1 border-b border-border/60 bg-card/90 px-2 py-1.5">
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Previous page" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-xs">
            <Input
              className="h-8 w-12 px-1 text-center"
              value={currentPage}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) goToPage(n);
              }}
              aria-label="Page number"
            />
            <span className="text-muted-foreground whitespace-nowrap">of {pageCount || "—"}</span>
          </div>
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Next page" disabled={currentPage >= pageCount} onClick={() => goToPage(currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Zoom out" onClick={() => applyCustomZoom(stepZoom(zoomPercent, -1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[4.5rem] text-center text-xs font-medium tabular-nums">{zoomLabel}</span>
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Zoom in" onClick={() => applyCustomZoom(stepZoom(zoomPercent, 1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant={zoomMode === "fit-width" ? "default" : "ghost"} className="h-8 px-2 text-xs" onClick={() => setZoomMode("fit-width")}>
            Fit width
          </Button>
          <Button type="button" size="sm" variant={zoomMode === "fit-page" ? "default" : "ghost"} className="h-8 px-2 text-xs" onClick={() => setZoomMode("fit-page")}>
            Fit page
          </Button>
          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
          <form
            className="hidden md:flex items-center gap-1"
            onSubmit={(e) => { e.preventDefault(); runFind(); }}
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 w-40"
              placeholder="Find in document"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              aria-label="Find in document"
            />
            <Button type="submit" size="sm" variant="ghost" className="h-8 px-2 text-xs" disabled={finding}>
              {finding ? "Finding…" : "Find"}
            </Button>
            {findHits.length > 0 && (
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={nextFind}>
                {findIndex + 1}/{findHits.length}
              </Button>
            )}
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={download}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={print}>
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto min-h-0"
        style={{ cursor: placementMode ? "crosshair" : undefined }}
      >
        <div className="flex flex-col items-center py-4 px-3">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
            const size = pageSizes.get(pageNum) || firstPage;
            const displayW = size.width * cssScale;
            const displayH = size.height * cssScale;
            return (
              <div key={pageNum} className="flex flex-col items-center w-full">
                <div
                  className="relative bg-white shadow-md"
                  data-page={pageNum}
                  style={{ width: displayW, height: displayH }}
                  onClick={(e) => handlePageClick(pageNum, e)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(pageNum, e)}
                >
                  <div
                    className="absolute top-0 left-0"
                    style={{
                      width: size.width,
                      height: size.height,
                      transform: `scale(${cssScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <canvas
                      ref={(el) => {
                        if (el) canvasRefs.current.set(pageNum, el);
                        else canvasRefs.current.delete(pageNum);
                      }}
                      style={{ display: "block" }}
                    />
                    {renderPageOverlay?.(pageNum)}
                  </div>
                </div>
                <PageDemarcator
                  page={pageNum}
                  total={pageCount}
                  nextLabel={nextTagLabel}
                  onNext={pageNum < pageCount ? () => {
                    if (onNextFromPage) onNextFromPage(pageNum);
                    else goToPage(pageNum + 1);
                  } : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
