import Image from "next/image";
import Link from "next/link";
import { BarChart3, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[600px] items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent" />
      <Image src="/brand/hero-wasatch.jpg" alt="Wasatch Front overview" fill priority className="object-cover" />
      <div className="relative z-10 container w-full py-16 text-white">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur-sm">
            Official TerraSatch prototype
          </div>
          <h1 className="text-4xl font-black tracking-tight text-primary-foreground md:text-5xl">AvyTS Terrain Intelligence</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-foreground/90">
            Slope-level terrain intelligence for the Wasatch Front. Built for avalanche forecasters, ski patrol, guides, and backcountry professionals.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/map">
                <Map className="mr-2 h-4 w-4" />
                Open live map
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/conditions">
                <BarChart3 className="mr-2 h-4 w-4" />
                Current conditions
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
