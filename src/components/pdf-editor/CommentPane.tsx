import { Check, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentAnnotation } from "./types";

interface CommentPaneProps {
  comments: CommentAnnotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, text: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function CommentPane({
  comments, selectedId, onSelect, onChange, onResolve, onDelete,
}: CommentPaneProps) {
  return (
    <aside className="w-64 shrink-0 border-l border-border/50 bg-card/40 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Comments</h3>
        <span className="text-[11px] text-muted-foreground">{comments.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Click Comment, then click the page to leave a note, like a Word comment balloon.</p>
        ) : comments.map((comment, index) => (
          <article
            key={comment.id}
            className={`rounded-md border p-2 space-y-1.5 ${selectedId === comment.id ? "ring-2 ring-primary" : "border-border/60"} ${comment.resolved ? "opacity-70" : ""}`}
            style={{ borderLeftWidth: 4, borderLeftColor: comment.color }}
            onClick={() => onSelect(comment.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium truncate">{index + 1}. {comment.author}</p>
              <div className="flex gap-0.5">
                <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" title={comment.resolved ? "Reopen" : "Resolve"} onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" title="Delete comment" onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Textarea
              value={comment.text}
              rows={3}
              className="text-xs min-h-[4rem]"
              placeholder="Write a comment…"
              onChange={(e) => onChange(comment.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {comment.resolved && <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Resolved</p>}
          </article>
        ))}
      </div>
    </aside>
  );
}
