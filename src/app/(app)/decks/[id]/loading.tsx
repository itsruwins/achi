import {
  HeaderSkeleton,
  LoadingShell,
  RowsSkeleton,
  Skeleton,
} from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="deck">
      {/* Back link */}
      <Skeleton className="mb-3 h-4 w-24" />
      <HeaderSkeleton actions={3} />

      {/* Study / quiz options row */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9.5 w-32" />
        <Skeleton className="h-9.5 w-32" />
      </div>

      <div className="mt-8">
        <Skeleton className="mb-3 h-4 w-20" />
        <RowsSkeleton count={6} />
      </div>
    </LoadingShell>
  );
}
