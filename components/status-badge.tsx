import { DANGER_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel, DangerRating } from "@/types/terrain";

const confidenceClasses: Record<ConfidenceLevel, string> = {
  low: "bg-slate-800 text-white",
  moderate: "bg-slate-200 text-slate-700",
  high: "bg-emerald-100 text-emerald-700",
};

export function StatusBadge({ status, confidence = false, className }: { status: DangerRating | ConfidenceLevel; confidence?: boolean; className?: string }) {
  const classes = confidence ? confidenceClasses[status as ConfidenceLevel] : DANGER_META[status as DangerRating].classes;
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium uppercase", classes, className)}>{status.replace("-", " ")}</span>;
}
