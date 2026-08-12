import {
  HeaderSkeleton,
  LoadingShell,
  RowsSkeleton,
  Skeleton,
  TileGridSkeleton,
} from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="community">
      <HeaderSkeleton actions={1} />

      <div className="mt-8">
        <Skeleton className="mb-3 h-4 w-20" />
        <RowsSkeleton count={4} />
      </div>

      <div className="mt-8">
        <Skeleton className="mb-3 h-4 w-28" />
        <TileGridSkeleton count={3} />
      </div>
    </LoadingShell>
  );
}
