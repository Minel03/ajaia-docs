import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DocumentList, type DocumentListItem } from "@/components/document-list";
import { DocumentListSkeleton } from "@/components/document-list-skeleton";
import { createClient } from "@/lib/supabase/server";

export default function RecentDocumentsPage() {
  return (
    <Suspense fallback={<DocumentListSkeleton />}>
      <RecentDocuments />
    </Suspense>
  );
}

async function RecentDocuments() {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("documents")
    .select("id,title,updated_at,owner_id,document_shares(permission,shared_with)")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    return <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Could not load recent documents. Please refresh and try again.</p>;
  }

  const documents: DocumentListItem[] = data.map((document) => {
    const isOwner = document.owner_id === user.id;
    const ownShare = document.document_shares.find((share) => share.shared_with === user.id);
    return {
      id: document.id,
      title: document.title,
      updated_at: document.updated_at,
      permission: ownShare?.permission,
      canRename: isOwner || ownShare?.permission === "editor",
      canDelete: isOwner,
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Your 10 most recently updated accessible documents</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Recent</h1>
      </header>
      <DocumentList documents={documents} emptyTitle="No recent documents" />
    </div>
  );
}
