import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading…</main>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
        <h1 className="text-2xl font-semibold">Dashboard placeholder</h1>
        <p className="text-muted-foreground">Signed in as {user.email}</p>
        <SignOutButton />
      </section>
    </main>
  );
}
