interface PageDemarcatorProps {
  page: number;
  total: number;
  onNext?: () => void;
  nextLabel?: string;
}

/** Marks the boundary of a page and, when needed, points to the next action. */
export default function PageDemarcator({ page, total, onNext, nextLabel }: PageDemarcatorProps) {
  return (
    <div className="flex items-center gap-3 w-full max-w-[820px] py-3 select-none" data-page-demarcator={page}>
      <div className="h-px flex-1 bg-border" />
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Page {page} of {total}
        </span>
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            data-next-page={page}
          >
            {nextLabel || "Next"}
            <span aria-hidden="true">›</span>
          </button>
        )}
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
