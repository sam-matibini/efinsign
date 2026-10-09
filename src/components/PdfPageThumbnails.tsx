import { Button } from "@/components/ui/button";
import { Trash2, GripVertical } from "lucide-react";
import { useCallback, useRef } from "react";

interface PdfPageThumbnailsProps {
  pages: { pageNum: number; deleted: boolean }[];
  onReorder: (from: number, to: number) => void;
  onDelete: (index: number) => void;
  onRestore: (index: number) => void;
  activePageIndex: number;
  onSelect: (index: number) => void;
}

export default function PdfPageThumbnails({
  pages,
  onReorder,
  onDelete,
  onRestore,
  activePageIndex,
  onSelect,
}: PdfPageThumbnailsProps) {
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOver.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current !== null && dragOver.current !== null && dragItem.current !== dragOver.current) {
      onReorder(dragItem.current, dragOver.current);
    }
    dragItem.current = null;
    dragOver.current = null;
  }, [onReorder]);

  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-full">
      <p className="text-xs font-medium text-muted-foreground px-1">Pages</p>
      {pages.map((page, index) => (
        <div
          key={`${page.pageNum}-${index}`}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => onSelect(index)}
          className={`relative flex items-center gap-1 p-2 rounded-md border cursor-pointer transition-colors ${
            page.deleted
              ? "opacity-40 border-destructive/30 bg-destructive/5"
              : activePageIndex === index
              ? "border-primary bg-primary/10"
              : "border-border/50 hover:border-primary/30 bg-card/60"
          }`}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab" />
          <span className="text-xs font-medium flex-1">Page {page.pageNum}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              page.deleted ? onRestore(index) : onDelete(index);
            }}
          >
            <Trash2 className={`h-3 w-3 ${page.deleted ? "text-muted-foreground" : "text-destructive"}`} />
          </Button>
        </div>
      ))}
    </div>
  );
}
