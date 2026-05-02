import { FileDown, Printer } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ConfidenceLevel, DailyBriefing, DangerRating } from "@/types/terrain";

export function ReportSummary({ briefing }: { briefing: DailyBriefing }) {
  return (
    <div className="grid gap-5">
      <Card className="glass-card topo-panel">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Executive summary</CardTitle>
              <CardDescription>{new Date(briefing.issuedAt).toLocaleString()}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" />Print layout</Button>
              <Button variant="accent" size="sm"><FileDown className="mr-2 h-4 w-4" />PDF export hook</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-7 text-muted-foreground">{briefing.executiveSummary}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <SummaryPanel title="Primary concerns" items={briefing.primaryConcerns} />
            <SummaryPanel title="Operational advice" items={briefing.operationalAdvice} />
          </div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Zone overview table</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <th className="pb-3">Metric</th>
                <th className="pb-3">Value</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {briefing.zoneOverviewTable.map((row) => {
                const isConfidence = row.label === "Confidence" || row.label === "Recent snowfall";
                return (
                  <tr key={row.label} className="border-t border-border">
                    <td className="py-4 font-medium text-foreground">{row.label}</td>
                    <td className="py-4 text-muted-foreground">{row.value}</td>
                    <td className="py-4">
                      {isConfidence ? (
                        <StatusBadge status={row.status as ConfidenceLevel} confidence />
                      ) : (
                        <StatusBadge status={row.status as DangerRating} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Weather and loading summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4 text-sm leading-7 text-muted-foreground">{briefing.weatherSummary}</div>
          <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4 text-sm leading-7 text-muted-foreground">{briefing.loadingSummary}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.25rem] border border-white/70 bg-white/70 p-4 backdrop-blur-xl">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-3 space-y-3 text-sm text-muted-foreground">
        {items.map((item) => (
          <p key={item}>• {item}</p>
        ))}
      </div>
    </div>
  );
}
