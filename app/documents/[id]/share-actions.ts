"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/first-relation";
import {
  documentIdSchema,
  shareDocumentSchema,
  shareIdSchema,
  updateSharePermissionSchema,
} from "@/lib/validation";

export type Collaborator = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  permission: "viewer" | "editor";
};

type ShareResult = { success: true; message?: string } | { success: false; error: string };
type CollaboratorsResult = { collaborators: Collaborator[] } | { error: string };
type OwnerAccess =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; user: User }
  | { ok: false; error: string };

async function requireDocumentOwner(documentId: string): Promise<OwnerAccess> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "Your session has expired. Please sign in again." };

  const { data: document, error } = await supabase.from("documents")
    .select("owner_id")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !document) {
    return { ok: false, error: "Document not found or you don't have permission to manage its sharing." };
  }
  if (document.owner_id !== user.id) {
    return { ok: false, error: "You don't have permission to manage sharing for this document." };
  }

  return { ok: true, supabase, user };
}

function revalidateSharePaths(documentId: string) {
  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/shared");
  revalidatePath("/dashboard/recent");
}

export async function getDocumentShares(documentId: string): Promise<CollaboratorsResult> {
  const parsedId = documentIdSchema.safeParse(documentId);
  if (!parsedId.success) return { error: "Invalid document ID." };

  const owner = await requireDocumentOwner(parsedId.data);
  if (!owner.ok) return { error: owner.error };

  const { data, error } = await owner.supabase.from("document_shares")
    .select("id,shared_with,permission,profiles!document_shares_shared_with_fkey(full_name,email)")
    .eq("document_id", parsedId.data)
    .order("created_at", { ascending: true });
  if (error) return { error: "Could not load collaborators. Please try again." };

  const collaborators: Collaborator[] = data.map((share) => {
    const profile = firstRelation(share.profiles);
    return {
      id: share.id,
      userId: share.shared_with,
      name: profile?.full_name ?? null,
      email: profile?.email ?? "Unknown email",
      permission: share.permission,
    };
  });

  return { collaborators };
}

export async function shareDocument(
  documentId: string,
  email: string,
  permission: string,
): Promise<ShareResult> {
  const parsed = shareDocumentSchema.safeParse({ documentId, email, permission });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid sharing details." };

  const owner = await requireDocumentOwner(parsed.data.documentId);
  if (!owner.ok) return { success: false, error: owner.error };

  const { data: profile, error: profileError } = await owner.supabase.from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (profileError) return { success: false, error: "Could not look up that email. Please try again." };
  if (!profile) return { success: false, error: "No user found with that email." };
  if (profile.id === owner.user.id) {
    return { success: false, error: "You can't share a document with yourself." };
  }

  const { data: existing, error: existingError } = await owner.supabase.from("document_shares")
    .select("id")
    .eq("document_id", parsed.data.documentId)
    .eq("shared_with", profile.id)
    .maybeSingle();
  if (existingError) return { success: false, error: "Could not check existing access. Please try again." };

  const { data: savedShare, error: saveError } = await owner.supabase.from("document_shares")
    .upsert({
      document_id: parsed.data.documentId,
      shared_with: profile.id,
      permission: parsed.data.permission,
    }, { onConflict: "document_id,shared_with" })
    .select("id")
    .maybeSingle();
  if (saveError?.code === "42501" || (!saveError && !savedShare)) {
    return { success: false, error: "You don't have permission to manage sharing for this document." };
  }
  if (saveError) return { success: false, error: "Could not share the document. Please try again." };

  revalidateSharePaths(parsed.data.documentId);
  return {
    success: true,
    message: existing ? "Already shared; permission updated." : "Document access granted.",
  };
}

export async function updateSharePermission(shareId: string, permission: string): Promise<ShareResult> {
  const parsed = updateSharePermissionSchema.safeParse({ shareId, permission });
  if (!parsed.success) return { success: false, error: "Invalid collaborator or permission." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "Your session has expired. Please sign in again." };

  const { data: share, error: shareError } = await supabase.from("document_shares")
    .select("document_id")
    .eq("id", parsed.data.shareId)
    .maybeSingle();
  if (shareError || !share) return { success: false, error: "You don't have permission to change this collaborator's access." };

  const { data, error } = await supabase.from("document_shares")
    .update({ permission: parsed.data.permission })
    .eq("id", parsed.data.shareId)
    .select("id");
  if (error?.code === "42501" || (!error && (!data || data.length === 0))) {
    return { success: false, error: "You don't have permission to change this collaborator's access." };
  }
  if (error) return { success: false, error: "Could not update this collaborator. Please try again." };
  if (!data || data.length === 0) return { success: false, error: "You don't have permission to change this collaborator's access." };

  revalidateSharePaths(share.document_id);
  return { success: true, message: "Permission updated." };
}

export async function removeShare(shareId: string): Promise<ShareResult> {
  const parsedId = shareIdSchema.safeParse(shareId);
  if (!parsedId.success) return { success: false, error: "Invalid collaborator." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "Your session has expired. Please sign in again." };

  const { data: share, error: shareError } = await supabase.from("document_shares")
    .select("document_id")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (shareError || !share) return { success: false, error: "You don't have permission to remove this collaborator." };

  const { data, error } = await supabase.from("document_shares")
    .delete()
    .eq("id", parsedId.data)
    .select("id");
  if (error?.code === "42501" || (!error && (!data || data.length === 0))) {
    return { success: false, error: "You don't have permission to remove this collaborator." };
  }
  if (error) return { success: false, error: "Could not remove this collaborator. Please try again." };
  if (!data || data.length === 0) return { success: false, error: "You don't have permission to remove this collaborator." };

  revalidateSharePaths(share.document_id);
  return { success: true, message: "Collaborator removed." };
}
