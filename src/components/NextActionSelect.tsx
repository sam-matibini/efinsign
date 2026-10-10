import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILL_NEXT_CHOICES } from "@/lib/nextAction";

export type NextChoice = { type: string; label: string };

interface NextActionSelectProps {
  choices?: readonly NextChoice[];
  onPick: (type: string) => void;
  label?: string;
  compact?: boolean;
}

export default function NextActionSelect({
  choices = FILL_NEXT_CHOICES,
  onPick,
  label = "Next",
  compact = false,
}: NextActionSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            compact
              ? "h-6 px-1.5 rounded bg-primary text-primary-foreground text-[11px] font-medium inline-flex items-center gap-0.5"
              : "h-8 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1"
          }
          title="Stick this text and move to the next action"
        >
          {label}
          <ChevronDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[80] w-44">
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
          Stick text, then go to
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {choices.map((choice) => (
          <DropdownMenuItem key={choice.type} onClick={() => onPick(choice.type)}>
            {choice.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
