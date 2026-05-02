"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AudioLines, CheckCircle2, FileUp, RadioTower, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateObservationDraft } from "@/lib/sherpai";
import type { FieldObservation, ForecastZone } from "@/types/terrain";
import { cn } from "@/lib/utils";

const EXAMPLE_TRANSCRIPTS = [
  "Skier reported cracking on a northeast test slope near 9300 feet with fresh wind drifts above rollover terrain.",
  "Ops channel says control team observed small natural sluffing after overnight snowfall and gusts from the southwest.",
  "Field team noted collapsing in sheltered trees, no recent avalanche seen, visibility improving after storm passage.",
];

export function SherpAIObservationWorkbench({ zone, observations }: { zone: ForecastZone; observations: FieldObservation[] }) {
  const realOnlyMode = process.env.NEXT_PUBLIC_REQUIRE_LIVE_TERRAIN_DATA !== "0";
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"upload" | "radio">("upload");
  const [rawInput, setRawInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [source, setSource] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [frequency, setFrequency] = useState("155.160 MHz");
  const [files, setFiles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pipelineMessage, setPipelineMessage] = useState<string | null>(null);
  const [serverDraft, setServerDraft] = useState<ReturnType<typeof generateObservationDraft> | null>(null);

  const draft = useMemo(
    () => serverDraft ?? generateObservationDraft({ zone, rawInput, transcript, source, locationHint, frequency: mode === "radio" ? frequency : "", attachedFiles: files }),
    [files, frequency, locationHint, mode, rawInput, serverDraft, source, transcript, zone],
  );

  async function generateDraft() {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      if (realOnlyMode) {
        setServerDraft(null);
        setPipelineMessage(null);
        setStatusMessage(mode === "radio" ? "Structured transcript preview refreshed from current inputs." : "Structured observation preview refreshed from current inputs.");
        return;
      }

      if (mode === "radio") {
        const response = await fetch("/api/sherpai/radio-ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zoneId: zone.id, transcript, source, locationHint, frequency, attachedFiles: files }),
        });
        if (!response.ok) {
          throw new Error("Radio ingestion is unavailable");
        }
        const payload = (await response.json()) as { draft: ReturnType<typeof generateObservationDraft>; job: { status: string; pipeline: string; frequency: string } };
        setServerDraft(payload.draft);
        setPipelineMessage(`${payload.job.pipeline} ${payload.job.status} on ${payload.job.frequency}`);
        setStatusMessage("SherpAI radio ingestion queued and draft updated.");
      } else {
        const response = await fetch("/api/sherpai/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zoneId: zone.id, rawInput, transcript, source, locationHint, frequency: "", attachedFiles: files }),
        });
        if (!response.ok) {
          throw new Error("Draft generation is unavailable");
        }
        const payload = (await response.json()) as { draft: ReturnType<typeof generateObservationDraft> };
        setServerDraft(payload.draft);
        setPipelineMessage(null);
        setStatusMessage("SherpAI draft refreshed from the API route.");
      }
    } catch (error) {
      setPipelineMessage(null);
      setStatusMessage(error instanceof Error ? error.message : "Structured draft refresh failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitObservation() {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const observationId = `user-${Date.now()}`;
      const observation: FieldObservation = {
        id: observationId,
        type: draft.type,
        zoneId: zone.id,
        source: draft.source,
        observedAt: new Date().toISOString(),
        title: draft.title,
        summary: draft.summary,
        locationName: draft.locationName,
        geometry: {
          type: "Feature",
          geometry: { type: "Point", coordinates: zone.geometry.geometry.coordinates[0][0] as [number, number] },
          properties: { observationId },
        },
        tags: draft.tags,
        avalancheObserved: draft.type === "avalanche",
        media: files,
      };

      await fetch("/api/observations/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation }),
      });
      await queryClient.invalidateQueries({ queryKey: ["observations", "recent"] });
      setStatusMessage(realOnlyMode ? "Observation saved to the live API feed." : "Observation saved to the local API feed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="border-b border-white/50 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
              {realOnlyMode ? null : <Image src="/brand/sherpai.png" alt="SherpAI" width={18} height={18} className="rounded-full" />}
              {realOnlyMode ? "Observation Intake Studio" : "SherpAI Observation Studio"}
            </div>
            <CardTitle className="mt-2 text-[1.15rem]">{realOnlyMode ? `Structured field intake for ${zone.name}` : `AI-assisted field intake for ${zone.name}`}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{realOnlyMode ? "Use typed notes, attachments, or pasted transcripts to prepare a structured observation before it hits the feed." : "Use typed notes, attachments, or radio transcripts to generate a structured observation draft before it hits the feed."}</p>
          </div>
          <div className="flex rounded-full border border-white/70 bg-white/70 p-1 shadow-sm">
            <ModeButton active={mode === "upload"} onClick={() => setMode("upload")} icon={FileUp} label="Upload" />
            <ModeButton active={mode === "radio"} onClick={() => setMode("radio")} icon={RadioTower} label="Radio" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-6 2xl:grid-cols-[minmax(0,1.12fr),minmax(320px,0.88fr)] 2xl:items-start">
        <div className="space-y-4 2xl:sticky 2xl:top-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-900">Observer or source</span>
              <input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Patrol 2, public observer, SAR lead" className="h-11 w-full rounded-[1rem] border border-white/70 bg-white/80 px-4 text-sm outline-none transition focus:border-sky-300 focus:bg-white" />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-900">Location hint</span>
              <input value={locationHint} onChange={(event) => setLocationHint(event.target.value)} placeholder="Cardiff Fork ridgeline" className="h-11 w-full rounded-[1rem] border border-white/70 bg-white/80 px-4 text-sm outline-none transition focus:border-sky-300 focus:bg-white" />
            </label>
          </div>

          {mode === "upload" ? (
            <>
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-slate-900">Field notes or uploaded content summary</span>
                <textarea value={rawInput} onChange={(event) => setRawInput(event.target.value)} rows={7} placeholder="Paste rough notes, summarize an uploaded voice memo, or drop in the main details from photos and field cards." className="w-full rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-6 outline-none transition focus:border-sky-300 focus:bg-white" />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-[1.1rem] border border-dashed border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-slate-700 transition hover:bg-sky-50">
                <span className="flex items-center gap-2"><FileUp className="h-4 w-4 text-sky-700" />Attach photos, audio, or field sheets</span>
                <input type="file" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files ?? []).map((file) => file.name))} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Select</span>
              </label>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-[0.42fr,0.58fr]">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900">Frequency</span>
                  <input value={frequency} onChange={(event) => setFrequency(event.target.value)} className="h-11 w-full rounded-[1rem] border border-white/70 bg-white/80 px-4 text-sm outline-none transition focus:border-sky-300 focus:bg-white" />
                </label>
                <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-semibold"><AudioLines className="h-4 w-4" />Transcript mode ready</div>
                  <p className="mt-1 leading-6">{realOnlyMode ? "Paste a verified radio transcript or dispatcher note, then refresh the structured preview before publishing." : "Modeled after SherpAI Radio: frequency selection, transcript extraction, and event structuring before observation publish."}</p>
                </div>
              </div>
              <label className="block space-y-2 text-sm">
                <span className="font-medium text-slate-900">Transcript or dispatcher notes</span>
                <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={7} placeholder={realOnlyMode ? "Paste a verified radio transcript or dispatch note to structure the observation." : "Paste a radio transcript or dispatch notes. SherpAI will extract the observation, likely type, and follow-up fields."} className="w-full rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-6 outline-none transition focus:border-sky-300 focus:bg-white" />
              </label>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_TRANSCRIPTS.map((example) => (
                  <button key={example} onClick={() => setTranscript(example)} className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-left text-xs text-slate-700 transition hover:bg-white">
                    {example.slice(0, 52)}...
                  </button>
                ))}
              </div>
            </>
          )}

          {files.length ? (
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <span key={file} className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700">{file}</span>
              ))}
            </div>
          ) : null}

          <div className="rounded-[1.1rem] border border-white/70 bg-white/70 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-semibold text-slate-900"><Wand2 className="h-4 w-4 text-sky-700" />Zone operating context</div>
            <p className="mt-2 leading-6">Current zone danger is <span className="font-semibold capitalize">{zone.danger.overall}</span> with {zone.windDirection} winds around {zone.windSpeedMph} mph and {zone.recentSnowfallIn} inches of recent snowfall.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={generateDraft} disabled={submitting}>{realOnlyMode ? (mode === "radio" ? "Refresh transcript preview" : "Refresh preview") : (mode === "radio" ? "Queue radio ingest" : "Generate draft")}</Button>
            <Button variant="outline" onClick={submitObservation} disabled={submitting}>Save observation</Button>
          </div>
          {statusMessage ? <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />{statusMessage}</p> : null}
          {pipelineMessage ? <p className="text-xs uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{pipelineMessage}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.35rem] border border-slate-900/8 bg-slate-950 p-5 text-white shadow-[0_18px_44px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">{realOnlyMode ? "Structured preview" : "Generated draft"}</div>
                <div className="mt-2 text-lg font-semibold leading-7">{draft.title}</div>
              </div>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">{draft.confidenceLabel}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-200">{draft.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoChip label="Type" value={draft.type} />
              <InfoChip label="Source" value={draft.source} />
              <InfoChip label="Location" value={draft.locationName} />
              <InfoChip label="Recent feed" value={`${observations.length} zone observations`} />
            </div>
            <p className="mt-4 rounded-[1rem] border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-slate-200">{draft.radioAcknowledgement}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.2rem] border border-white/70 bg-white/76 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-sky-700" />Suggested tags</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">{tag}</span>
                ))}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-white/70 bg-white/76 p-4">
              <div className="text-sm font-semibold text-slate-900">Missing fields</div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {draft.missingFields.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-white/70 bg-white/76 p-4">
            <div className="text-sm font-semibold text-slate-900">Follow-up checks</div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {draft.suggestedQuestions.map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ModeButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof FileUp; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition",
        active ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-950",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/12 bg-white/8 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">{label}</div>
      <div className="mt-1 text-sm font-medium text-white capitalize">{value}</div>
    </div>
  );
}