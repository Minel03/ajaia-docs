import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import type { JSONContent } from "@tiptap/core";
import { DocumentListSkeleton } from "@/components/document-list-skeleton";
import { TiptapEditor } from "@/components/tiptap-editor";
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
    .select("id,title,content,owner_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !document) notFound();

  let role: "owner" | "editor" | "viewer";
  if (document.owner_id === user.id) {
    role = "owner";
  } else {
    const { data: share, error: shareError } = await supabase.from("document_shares")
      .select("permission")
      .eq("document_id", id)
      .eq("shared_with", user.id)
      .maybeSingle();
    if (shareError || !share) notFound();
    role = share.permission;
  }

  const storedContent = document.content && typeof document.content === "object"
    ? document.content as JSONContent
    : { type: "doc", content: [] } satisfies JSONContent;
  const content = storedContent.type === "doc" && (!storedContent.content || storedContent.content.length === 0)
    ? { type: "doc", content: [{ type: "paragraph" }] } satisfies JSONContent
    : storedContent;

  return (
    <TiptapEditor
      documentId={document.id}
      initialTitle={document.title}
      initialContent={content}
      role={role}
      owner={role === "owner" ? {
        name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "Owner",
        email: user.email ?? "",
      } : undefined}
    />
  );
}
