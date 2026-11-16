import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DocumentList, type DocumentListItem } from "@/components/document-list";
import { DocumentListSkeleton } from "@/components/document-list-skeleton";
import { createClient } from "@/lib/supabase/server";

export default function SharedDocumentsPage() {
  return (
    <Suspense fallback={<DocumentListSkeleton />}>
      <SharedDocuments />
    </Suspense>
  );
}

async function SharedDocuments() {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("document_shares")
    .select("permission,documents!inner(id,title,updated_at,owner:profiles!documents_owner_id_fkey(full_name,email))")
    .eq("shared_with", user.id)
    .order("updated_at", { referencedTable: "documents", ascending: false });

  if (error) {
    return <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Could not load shared documents. Please refresh and try again.</p>;
  }

  const documents: DocumentListItem[] = data.flatMap((share) =>
    share.documents.map((document) => {
      const owner = Array.isArray(document.owner) ? document.owner[0] : document.owner;
      return {
        id: document.id,
        title: document.title,
        updated_at: document.updated_at,
        ownerName: owner?.full_name,
        ownerEmail: owner?.email,
        permission: share.permission,
        canRename: share.permission === "editor",
        canDelete: false,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Documents shared with your account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Shared with Me</h1>
      </header>
      <DocumentList documents={documents} emptyTitle="Nothing shared with you yet" />
    </div>
  );
}
