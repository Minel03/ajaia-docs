import { Skeleton } from "@/components/ui/skeleton";

export function DocumentListSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading documents" role="status">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2 rounded-xl border bg-card p-4">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading documents...</span>
    </div>
  );
}
