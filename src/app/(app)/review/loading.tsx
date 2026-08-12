import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="review">
      <HeaderSkeleton actions={0} />

      {/* Progress rail */}
      <div>
        <div className="mb-1.5 flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-1 w-full rounded-pill" />
      </div>

      {/* The card being reviewed */}
      <Skeleton className="mt-6 h-64 w-full rounded-card sm:h-72" />

      {/* Four rating buttons */}
      <div className="mt-6 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </LoadingShell>
  );
}
