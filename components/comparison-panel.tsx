import Image from "next/image";
import { Hexagon, Shield } from "lucide-react";
import { COMPARISON_COLUMNS } from "@/data/site-content";
import { Card, CardContent } from "@/components/ui/card";

export function ComparisonPanel() {
  return (
    <section className="bg-background px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold">Regional Forecasting → Terrain Intelligence</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            UAC provides critical regional avalanche forecasting for the Wasatch Front. AvyTS extends this with high-resolution, terrain-aware intelligence for localized decision support.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border shadow-lg">
          <div className="relative aspect-[16/10] w-full bg-slate-200">
            <Image src="/brand/comparison-map.png" alt="Comparison between regional forecasting and terrain intelligence" fill className="object-cover" />
          </div>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <Card className="rounded-lg">
            <CardContent className="p-6">
              <h3 className="mb-2 flex items-center gap-2 font-semibold"><Shield className="h-5 w-5 text-primary" /> UAC Regional Forecasting</h3>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {COMPARISON_COLUMNS.regional.map((item) => <p key={item}>• {item}</p>)}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-accent/30">
            <CardContent className="p-6">
              <h3 className="mb-2 flex items-center gap-2 font-semibold"><Hexagon className="h-5 w-5 text-accent" /> AvyTS Terrain Intelligence</h3>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {COMPARISON_COLUMNS.terrain.map((item) => <p key={item}>• {item}</p>)}
              </div>
            </CardContent>
          </Card>
      </div>
      </div>
    </section>
  );
}
