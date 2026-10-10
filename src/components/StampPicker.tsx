import { Button } from "@/components/ui/button";
import { Stamp } from "lucide-react";
import { COMPANY_SEALS, companySealDataUrl, type CompanySealId } from "@/lib/companySeals";

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
      <p className="text-xs font-medium text-muted-foreground pt-1">Company seals</p>
      <div className="flex flex-wrap gap-2">
        {COMPANY_SEALS.map((seal) => (
          <button
            key={seal.id}
            type="button"
            title={`${seal.legalName} corporate seal`}
            className={`rounded-full border bg-card p-1 ${selected === seal.stampLabel ? "ring-2 ring-primary" : "border-border"}`}
            onClick={() => onSelect(seal.stampLabel)}
          >
            <img src={companySealDataUrl(seal.id as CompanySealId)} alt={`${seal.legalName} corporate seal`} className="h-14 w-14" />
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">Applied with this document’s signing record by an authorized signatory.</p>
    </div>
  );
}
