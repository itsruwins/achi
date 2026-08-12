import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="new deck">
      <Skeleton className="mb-3 h-4 w-24" />
      <HeaderSkeleton actions={0} />

      <div className="rounded-card border border-border bg-surface p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-2 h-9.5 w-full" />
          </div>
        ))}
        <Skeleton className="mt-6 h-11 w-36" />
      </div>
    </LoadingShell>
  );
}
