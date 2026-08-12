import {
  HeaderSkeleton,
  LoadingShell,
  PanelSkeleton,
  Skeleton,
} from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="stats">
      <HeaderSkeleton actions={0} />

      {/* Four stat tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Activity heatmap */}
      <div className="mt-3">
        <PanelSkeleton />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>

      <div className="mt-3">
        <PanelSkeleton />
      </div>
    </LoadingShell>
  );
}
