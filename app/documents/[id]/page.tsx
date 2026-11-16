import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DocumentListSkeleton } from "@/components/document-list-skeleton";
import { createClient } from "@/lib/supabase/server";

type DocumentPageProps = { params: Promise<{ id: string }> };

export default function DocumentPage({ params }: DocumentPageProps) {
  return (
    <Suspense fallback={<DocumentListSkeleton />}>
      <DocumentContent params={params} />
    </Suspense>
  );
}

async function DocumentContent({ params }: DocumentPageProps) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: document, error } = await supabase.from("documents")
    .select("id,title,content")
    .eq("id", id)
    .maybeSingle();
  if (error || !document) notFound();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl bg-background px-4 py-8 sm:px-8">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Back to My Documents</Link>
      <header className="my-8 border-b pb-6">
        <p className="text-sm text-muted-foreground">Document</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{document.title}</h1>
      </header>
      <pre className="overflow-x-auto rounded-xl border bg-muted/30 p-5 text-sm leading-6">
        {JSON.stringify(document.content, null, 2)}
      </pre>
    </main>
  );
}
