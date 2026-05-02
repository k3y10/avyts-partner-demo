import Link from "next/link";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="container py-20">
      <EmptyState
        title="Offline shell ready"
        description="The AvyTS shell is cached. Reconnect to refresh live station, forecast, and terrain detail responses."
        action={<Button asChild><Link href="/map">Return to map</Link></Button>}
      />
    </div>
  );
}
