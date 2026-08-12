import { LoadingShell, Skeleton } from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="flashcards">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      <Skeleton className="h-1 w-full rounded-pill" />

      {/* The card */}
      <Skeleton className="mt-6 h-72 w-full rounded-card sm:h-80" />

      <div className="mt-6 flex items-center justify-between gap-2">
        <Skeleton className="h-11 w-24" />
        <Skeleton className="h-11 w-32" />
        <Skeleton className="h-11 w-24" />
      </div>
    </LoadingShell>
  );
}
