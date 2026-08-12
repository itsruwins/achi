import { LoadingShell, Skeleton } from "@/components/ui/layout";

export default function Loading() {
  return (
    <LoadingShell label="shared deck">
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Skeleton className="mt-8 h-11 w-40" />
      </div>
    </LoadingShell>
  );
}
