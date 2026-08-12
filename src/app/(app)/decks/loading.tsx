import {
  HeaderSkeleton,
  LoadingShell,
  Skeleton,
  TileGridSkeleton,
} from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="your decks">
      <HeaderSkeleton />

      {/* Folder bar */}
      <div className="flex gap-2 overflow-hidden">
        {["w-16", "w-24", "w-20", "w-28"].map((w) => (
          <Skeleton key={w} className={`h-7 shrink-0 rounded-pill ${w}`} />
        ))}
      </div>

      <div className="mt-5">
        <TileGridSkeleton />
      </div>
    </LoadingShell>
  );
}
