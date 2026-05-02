import Link from "next/link";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container py-20">
      <EmptyState
        title="Route not found"
        description="The requested page is outside the active terrain workspace."
        action={<Button asChild><Link href="/">Return home</Link></Button>}
      />
    </div>
  );
}
