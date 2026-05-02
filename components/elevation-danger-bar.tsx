import { StatusBadge } from "@/components/status-badge";
import type { DangerRating } from "@/types/terrain";

export function ElevationDangerBar({ above, near, below }: { above: DangerRating; near: DangerRating; below: DangerRating }) {
  return (
    <div className="space-y-1.5">
      <ElevationRow label="Above Treeline" status={above} />
      <ElevationRow label="Near Treeline" status={near} />
      <ElevationRow label="Below Treeline" status={below} />
    </div>
  );
}

function ElevationRow({ label, status }: { label: string; status: DangerRating }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <StatusBadge status={status} />
    </div>
  );
}