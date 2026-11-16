"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: boolean };

const createDocumentSchema = z.object({ title: z.literal("Untitled document") }).strict();
const documentIdSchema = z.uuid("Invalid document ID.");
const titleSchema = z.string().trim().min(1, "Title cannot be empty.").max(200, "Title must be 200 characters or fewer.");
const documentContentSchema = z.object({
  documentId: documentIdSchema,
  content: z.object({ type: z.literal("doc") }).passthrough(),
});
const maxDocumentContentBytes = 1_000_000;

function revalidateDashboardPaths(documentId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/shared");
  revalidatePath("/dashboard/recent");
  if (documentId) revalidatePath(`/documents/${documentId}`);
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

export async function createDocument(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createDocumentSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) return { error: "Invalid create document request." };

  const session = await getAuthenticatedClient();
  if (!session) return { error: "Your session has expired. Please sign in again." };

  const { data, error } = await session.supabase.from("documents")
    .insert({ title: "Untitled document", owner_id: session.user.id })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create the document." };

  revalidateDashboardPaths(data.id);
  redirect(`/documents/${data.id}`);
}

export async function renameDocument(formData: FormData): Promise<ActionState> {
  const parsed = z.object({ id: documentIdSchema, title: titleSchema }).safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid title." };

  const session = await getAuthenticatedClient();
  if (!session) return { error: "Your session has expired. Please sign in again." };

  const { data, error } = await session.supabase.from("documents")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.id)
    .select("id");
  if (error?.code === "42501" || (!error && data.length === 0)) {
    return { error: "You don't have permission to rename this document." };
  }
  if (error) return { error: `Could not rename the document: ${error.message}` };
  if (!data || data.length === 0) return { error: "You don't have permission to rename this document." };

  revalidateDashboardPaths(parsed.data.id);
  return { success: true };
}

export async function deleteDocument(formData: FormData): Promise<ActionState> {
  const parsed = z.object({ id: documentIdSchema }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid document ID." };

  const session = await getAuthenticatedClient();
  if (!session) return { error: "Your session has expired. Please sign in again." };

  const { data, error } = await session.supabase.from("documents")
    .delete()
    .eq("id", parsed.data.id)
    .select("id");
  if (error?.code === "42501" || (!error && data.length === 0)) {
    return { error: "You don't have permission to delete this document." };
  }
  if (error) return { error: `Could not delete the document: ${error.message}` };
  if (!data || data.length === 0) return { error: "You don't have permission to delete this document." };

  revalidateDashboardPaths(parsed.data.id);
  return { success: true };
}

export async function updateDocumentContent(documentId: string, content: unknown): Promise<ActionState> {
  const parsed = documentContentSchema.safeParse({ documentId, content });
  if (!parsed.success) return { error: "Invalid document content." };

  let serializedContent: string;
  try {
    serializedContent = JSON.stringify(parsed.data.content);
  } catch {
    return { error: "Document content must be valid JSON." };
  }
  if (new TextEncoder().encode(serializedContent).byteLength > maxDocumentContentBytes) {
    return { error: "Document content exceeds the 1 MB limit." };
  }

  const session = await getAuthenticatedClient();
  if (!session) return { error: "Your session has expired. Please sign in again." };

  const { data, error } = await session.supabase.from("documents")
    .update({ content: parsed.data.content })
    .eq("id", parsed.data.documentId)
    .select("id");
  if (error?.code === "42501" || (!error && (!data || data.length === 0))) {
    return { error: "You don't have permission to edit this document." };
  }
  if (error) return { error: `Could not save the document: ${error.message}` };
  if (!data || data.length === 0) return { error: "You don't have permission to edit this document." };

  revalidateDashboardPaths(parsed.data.documentId);
  return { success: true };
}
