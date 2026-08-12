import {
  HeaderSkeleton,
  LoadingShell,
  Skeleton,
  TileGridSkeleton,
} from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="community">
      <HeaderSkeleton actions={1} />

      {/* Search field */}
      <Skeleton className="h-9.5 w-full max-w-sm" />

      <div className="mt-8">
        <Skeleton className="mb-3 h-4 w-32" />
        <TileGridSkeleton count={3} />
      </div>

      <div className="mt-8">
        <Skeleton className="mb-3 h-4 w-28" />
        <TileGridSkeleton count={6} />
      </div>
    </LoadingShell>
  );
}
