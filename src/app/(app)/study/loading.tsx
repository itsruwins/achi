import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="study">
      <HeaderSkeleton actions={0} />

      <div className="rounded-card border border-border bg-surface p-4">
        <Skeleton className="h-3.5 w-24" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="mt-6 h-11 w-full sm:w-40" />
      </div>
    </LoadingShell>
  );
}
