import Image from "next/image";
import { SHERPAI_FEATURES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SherpAISection() {
  const realOnlyMode = process.env.NEXT_PUBLIC_REQUIRE_LIVE_TERRAIN_DATA !== "0";

  if (realOnlyMode) {
    return null;
  }

  return (
    <section className="container py-16">
      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <Card className="overflow-hidden border-primary/10 bg-slate-950 text-white">
          <div className="relative min-h-[320px]">
            <Image src="/brand/sherpai.png" alt="SherpAI assistant illustration" fill className="object-cover opacity-85" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">SherpAI</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">A terrain-aware briefing companion for the field.</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-200">SherpAI is framed as practical decision support: grounded summaries, transparent scoring explanations, and future workflow hooks for teams in motion.</p>
            </div>
          </div>
        </Card>
        <div className="grid gap-5">
          {SHERPAI_FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <feature.icon className="h-6 w-6 text-accent" />
                  <CardTitle>{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
