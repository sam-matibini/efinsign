import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EDITOR_FONTS, HIGHLIGHT_BG_PRESETS, LINE_SPACING } from "@/lib/editorFonts";
import { EMPTY_FIELD_STYLE, type FieldStyle } from "@/lib/fieldStyle";
import type { EditorFont } from "@/lib/editorFonts";
import type { TextAlign } from "@/lib/textLayout";

interface FieldFormatBarProps {
  style: FieldStyle;
  onChange: (next: FieldStyle) => void;
}

export default function FieldFormatBar({ style, onChange }: FieldFormatBarProps) {
  const s = { ...EMPTY_FIELD_STYLE, ...style };
  const patch = (part: Partial<FieldStyle>) => onChange({ ...s, ...part });

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Select value={s.fontFamily || "helvetica"} onValueChange={(v) => patch({ fontFamily: v as EditorFont })}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {EDITOR_FONTS.map((f) => (
            <SelectItem key={f.id} value={f.id}><span style={{ fontFamily: f.css }}>{f.label}</span></SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant={s.bold ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" title="Bold" onClick={() => patch({ bold: !s.bold })}>
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant={s.italic ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" title="Italic" onClick={() => patch({ italic: !s.italic })}>
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant={s.underline ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" title="Underline" onClick={() => patch({ underline: !s.underline })}>
        <Underline className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant={s.strikethrough ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" title="Strikethrough" onClick={() => patch({ strikethrough: !s.strikethrough })}>
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>
      <input type="color" value={s.color || "#111827"} onChange={(e) => patch({ color: e.target.value })} className="h-7 w-7 rounded cursor-pointer" title="Text color" />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-7 w-7 rounded border border-border"
            style={{ backgroundColor: !s.backgroundColor || s.backgroundColor === "none" ? "#ffffff" : s.backgroundColor }}
            title="Text background"
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 flex gap-1">
          {HIGHLIGHT_BG_PRESETS.map((c) => (
            <button
              key={c.value}
              type="button"
              className="h-6 w-6 rounded border border-border"
              style={{ backgroundColor: c.value === "none" ? "transparent" : c.value }}
              title={c.label}
              onClick={() => patch({ backgroundColor: c.value })}
            />
          ))}
        </PopoverContent>
      </Popover>
      {([
        ["left", AlignLeft],
        ["center", AlignCenter],
        ["right", AlignRight],
      ] as const).map(([value, Icon]) => (
        <Button key={value} type="button" variant={s.align === value ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" title={`Align ${value}`} onClick={() => patch({ align: value as TextAlign })}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
      <Select value={String(s.lineHeight || 1.15)} onValueChange={(v) => patch({ lineHeight: Number(v) })}>
        <SelectTrigger className="h-8 w-16 text-xs" title="Line spacing"><SelectValue /></SelectTrigger>
        <SelectContent>
          {LINE_SPACING.map((item) => (
            <SelectItem key={item.value} value={String(item.value)}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
