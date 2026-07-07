import { Button } from "@/components/ui/button";
import { Stamp } from "lucide-react";

const STAMPS = [
  { label: "Approved", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { label: "Draft", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "Confidential", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  { label: "Final", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  { label: "Void", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
];

interface StampPickerProps {
  onSelect: (stamp: string) => void;
  selected: string | null;
}

export default function StampPicker({ onSelect, selected }: StampPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Stamp className="h-3 w-3" /> Stamps
      </p>
      <div className="flex flex-wrap gap-1.5">
        {STAMPS.map((stamp) => (
          <Button
            key={stamp.label}
            variant="ghost"
            size="sm"
            className={`text-xs h-7 px-2 ${stamp.color} ${stamp.bg} border ${
              selected === stamp.label ? "ring-2 ring-primary" : "border-transparent"
            }`}
            onClick={() => onSelect(stamp.label)}
          >
            {stamp.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
