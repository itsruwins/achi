import { LoadingShell, Skeleton } from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="quiz">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      <Skeleton className="h-1 w-full rounded-pill" />

      {/* Question */}
      <Skeleton className="mt-6 h-20 w-full rounded-card" />

      {/* Answer choices */}
      <div className="mt-4 grid gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </LoadingShell>
  );
}
