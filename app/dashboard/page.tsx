import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { CreateDocumentButton } from "@/components/create-document-button";
import { DocumentList, type DocumentListItem } from "@/components/document-list";
import { DocumentListSkeleton } from "@/components/document-list-skeleton";
import { createClient } from "@/lib/supabase/server";

export default function MyDocumentsPage() {
  return (
    <Suspense fallback={<DocumentListSkeleton />}>
      <MyDocuments />
    </Suspense>
  );
}

async function MyDocuments() {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("documents")
    .select("id,title,updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Could not load your documents. Please refresh and try again.</p>;
  }

  const documents: DocumentListItem[] = data.map((document) => ({
    ...document,
    canRename: true,
    canDelete: true,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Your workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">My Documents</h1>
        </div>
        <CreateDocumentButton />
      </header>
      <DocumentList documents={documents} />
    </div>
  );
}
