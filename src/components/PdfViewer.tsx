import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PageDemarcator from "@/components/PageDemarcator";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  className?: string;
  placementMode?: boolean;
  onPageClick?: (pageNumber: number, x: number, y: number) => void;
  onPageDrop?: (pageNumber: number, x: number, y: number, fieldType: string, sealLabel?: string) => void;
  renderPageOverlay?: (pageNumber: number) => React.ReactNode;
  /** When set, each page boundary can show a Next tag for the following action. */
  onNextFromPage?: (pageNumber: number) => void;
  nextTagLabel?: string;
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
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Load PDF metadata
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
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

  // Render pages after canvases are mounted
  useEffect(() => {
    const pdf = pdfDocRef.current;
    if (!pdf || pageCount === 0) return;
    let cancelled = false;

    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      const renderAll = async () => {
        for (let i = 1; i <= pageCount; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const canvas = canvasRefs.current.get(i);
          if (!canvas) continue;
          const viewport = page.getViewport({ scale: 1.5 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          try {
            await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          } catch (e: any) {
            if (e?.name === "RenderingCancelledException") return;
          }
        }
      };
      renderAll();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [pageCount]);

  const handlePageClick = useCallback(
    (pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementMode || !onPageClick) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onPageClick(pageNumber, Math.round(x), Math.round(y));
    },
    [placementMode, onPageClick]
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
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onPageDrop(pageNumber, Math.round(x), Math.round(y), fieldType, e.dataTransfer.getData("sealLabel") || undefined);
    },
    [onPageDrop]
  );

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className}`}>
        <p>Failed to load PDF: {error}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-auto ${className}`} style={placementMode ? { cursor: "crosshair" } : undefined}>
      <div className="flex flex-col items-center">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
        <div key={pageNum} className="flex flex-col items-center">
        <div
          className="relative inline-block"
          data-page={pageNum}
          onClick={(e) => handlePageClick(pageNum, e)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(pageNum, e)}
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
        <PageDemarcator
          page={pageNum}
          total={pageCount}
          nextLabel={nextTagLabel}
          onNext={pageNum < pageCount ? () => {
            if (onNextFromPage) onNextFromPage(pageNum);
            else document.querySelector(`[data-page="${pageNum + 1}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          } : undefined}
        />
        </div>
      ))}
      </div>
    </div>
  );
}
