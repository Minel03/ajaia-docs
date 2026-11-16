import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { DashboardNav } from "@/components/dashboard-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: ReactNode }) {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const name = typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim()
    : user.email ?? "Account";

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <aside className="flex w-full flex-col border-b bg-card md:min-h-screen md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 md:block md:pb-8">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">Ajaia Docs</Link>
          <div className="md:hidden"><SignOutButton /></div>
        </div>
        <div className="px-5 pb-3 md:hidden">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <nav className="px-3 pb-3 md:px-3" aria-label="Documents">
          <DashboardNav />
        </nav>
        <div className="mt-auto hidden border-t p-4 md:block">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

function AppShellSkeleton() {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b p-5 md:min-h-screen md:w-64 md:border-r md:border-b-0">
        <Skeleton className="h-6 w-32" />
        <div className="mt-8 space-y-3"><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /></div>
      </aside>
      <main className="flex-1 p-6 lg:p-10"><Skeleton className="mx-auto h-72 max-w-5xl" /></main>
    </div>
  );
}
