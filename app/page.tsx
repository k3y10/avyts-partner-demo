"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CapabilityGrid } from "@/components/capability-grid";

const EMPTY_ZONES: never[] = [];
import { ComparisonPanel } from "@/components/comparison-panel";
import { ConditionCards } from "@/components/condition-cards";
import { HeroSection } from "@/components/hero-section";
import { SherpAISection } from "@/components/sherpai-section";
import { ZoneList } from "@/components/zone-list";
import { LoadingState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useCurrentForecast } from "@/hooks/use-current-forecast";
import { DEFAULT_ZONE_ID } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const forecastQuery = useCurrentForecast();
  const [selectedZoneId, setSelectedZoneId] = useState(DEFAULT_ZONE_ID);
  const zones = forecastQuery.data?.zones ?? EMPTY_ZONES;
  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId) ?? zones[0], [zones, selectedZoneId]);

  if (forecastQuery.isLoading || !selectedZone) {
    return <div className="container py-10"><LoadingState title="Loading Wasatch overview" description="Pulling forecast zone context and current conditions." /></div>;
  }

  if (forecastQuery.isError) {
    return <div className="container py-10"><ErrorState title="Unable to load Wasatch overview" description="Check the built-in Next.js API routes and the live UAC advisory connection." /></div>;
  }

  return (
    <>
      <HeroSection />
      <ComparisonPanel />
      <section className="container py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Wasatch Front Conditions</h2>
            <p className="text-sm text-muted-foreground">Current UAC forecast zone danger ratings</p>
          </div>
          <Button asChild variant="ghost">
            <Link href="/map">Open map workspace</Link>
          </Button>
        </div>
        <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
          <ZoneList zones={zones} selectedZoneId={selectedZone.id} onSelect={setSelectedZoneId} />
          <ConditionCards zone={selectedZone} />
        </div>
      </section>
      <CapabilityGrid />
      <SherpAISection />
      <footer className="border-t bg-card px-6 py-8">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/brand/avyts-logo.png" alt="AvyTS" width={24} height={24} className="rounded" />
            <span>AvyTS by TerraSatch · Avalanche Terrain Systems</span>
          </div>
          <div className="flex gap-4">
            <Link href="https://terrasatch.com" className="hover:text-foreground">terrasatch.com</Link>
            <Link href="https://utahavalanchecenter.org" className="hover:text-foreground">utahavalanchecenter.org</Link>
            <Link href="/map" className="inline-flex items-center gap-1 hover:text-foreground">Open map <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </footer>
    </>
  );
}
