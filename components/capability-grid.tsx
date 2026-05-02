import { CAPABILITIES } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";

export function CapabilityGrid() {
  return (
    <section className="bg-background px-6 py-16">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="mb-10 text-center text-2xl font-bold">Platform Capabilities</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((capability) => (
            <Card key={capability.title} className="rounded-lg">
              <CardContent className="p-5">
                <capability.icon className="mb-3 h-8 w-8 text-accent" />
                <h3 className="mb-1 text-sm font-semibold">{capability.title}</h3>
                <p className="text-xs text-muted-foreground">{capability.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
