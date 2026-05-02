import { Camera, MapPin, NotebookText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { FieldObservation } from "@/types/terrain";

export function ObservationList({ observations }: { observations: FieldObservation[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent field observations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {observations.map((observation) => (
          <div key={observation.id} className="rounded-[1.25rem] border border-border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">{observation.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {observation.locationName} · {new Date(observation.observedAt).toLocaleString()}
                </div>
              </div>
              {observation.avalancheObserved ? <StatusBadge status="high" /> : <StatusBadge status="moderate" />}
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{observation.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {observation.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">{tag}</span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-2"><NotebookText className="h-3.5 w-3.5" />{observation.source}</span>
              <span className="inline-flex items-center gap-2"><Camera className="h-3.5 w-3.5" />{observation.media.length} media items</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
