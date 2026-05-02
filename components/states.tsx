import { AlertTriangle, LoaderCircle, MapPinned } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function LoadingState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="topo-panel mx-auto max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="mx-auto max-w-2xl border-danger-high/40 bg-red-50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-danger-high" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function EmptyState({ title, description, action, compact = false }: { title: string; description: string; action?: React.ReactNode; compact?: boolean }) {
  return (
    <Card className={`mx-auto bg-gradient-to-br from-white to-slate-50 ${compact ? "max-w-none" : "max-w-2xl"}`}>
      <CardHeader className={compact ? "p-5" : undefined}>
        <div className="flex items-center gap-3">
          <MapPinned className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {action ? <CardContent className={compact ? "px-5 pb-5" : undefined}>{action}</CardContent> : null}
    </Card>
  );
}
