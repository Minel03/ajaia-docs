import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_PASSWORD ?? "DemoPass123!";

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Set the Supabase URL, anon key, and service role key in .env.local.");
}

function userClient(): SupabaseClient {
  return createClient(supabaseUrl!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const results: Array<{ name: string; passed: boolean; detail?: string }> = [];

function record(name: string, passed: boolean, detail?: string) {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function signedIn(email: string) {
  const client = userClient();
  const { error } = await client.auth.signInWithPassword({ email, password: demoPassword });
  if (error) throw new Error(`Could not sign in ${email}: ${error.message}`);
  return client;
}

let documentId: string | null = null;

try {
  const alice = await signedIn("alice@demo.test");
  const bob = await signedIn("bob@demo.test");
  const carol = await signedIn("carol@demo.test");

  const [{ data: aliceAuth }, { data: bobAuth }, { data: carolAuth }] = await Promise.all([
    alice.auth.getUser(), bob.auth.getUser(), carol.auth.getUser(),
  ]);
  if (!aliceAuth.user || !bobAuth.user || !carolAuth.user) throw new Error("Demo user session missing.");

  const { data: document, error: createError } = await alice
    .from("documents")
    .insert({ owner_id: aliceAuth.user.id, title: `RLS verification ${new Date().toISOString()}` })
    .select("id")
    .single();
  if (createError || !document) throw createError ?? new Error("Alice could not create a document.");
  documentId = document.id;
  record("Alice creates a document", true);

  const { data: bobBeforeShare, error: bobBeforeShareError } = await bob
    .from("documents").select("id").eq("id", documentId);
  record("Bob cannot read Alice's unshared document", !bobBeforeShareError && bobBeforeShare.length === 0);

  const { error: viewerShareError } = await alice.from("document_shares").insert({
    document_id: documentId, shared_with: bobAuth.user.id, permission: "viewer",
  });
  if (viewerShareError) throw viewerShareError;

  const { data: bobViewerRead, error: viewerReadError } = await bob
    .from("documents").select("id").eq("id", documentId);
  record("Bob can read the viewer-shared document", !viewerReadError && bobViewerRead.length === 1);

  const { data: viewerUpdateRows, error: viewerUpdateError } = await bob
    .from("documents").update({ content: { type: "doc", content: [{ type: "text" }] } })
    .eq("id", documentId).select("id");
  record("Bob viewer update affects zero rows", !viewerUpdateError && viewerUpdateRows.length === 0);

  const { error: upgradeError } = await alice.from("document_shares")
    .update({ permission: "editor" }).eq("document_id", documentId).eq("shared_with", bobAuth.user.id);
  if (upgradeError) throw upgradeError;

  const { data: editorUpdateRows, error: editorUpdateError } = await bob
    .from("documents").update({ content: { type: "doc", content: [{ type: "paragraph" }] } })
    .eq("id", documentId).select("id");
  record("Bob editor can update document content", !editorUpdateError && editorUpdateRows.length === 1);

  const { error: ownerChangeError } = await bob.from("documents")
    .update({ owner_id: bobAuth.user.id }).eq("id", documentId);
  record(
    "Bob editor cannot change document owner",
    ownerChangeError?.code === "P0001" && ownerChangeError.message.includes("owner cannot be changed"),
  );

  const { data: editorDeleteRows, error: editorDeleteError } = await bob.from("documents")
    .delete().eq("id", documentId).select("id");
  record("Bob editor cannot delete document", !editorDeleteError && editorDeleteRows.length === 0);

  const { data: shareInsertRows, error: shareInsertError } = await bob.from("document_shares")
    .insert({ document_id: documentId, shared_with: carolAuth.user.id, permission: "viewer" })
    .select("id");
  record(
    "Bob editor cannot insert shares",
    shareInsertError?.code === "42501" || (shareInsertError === null && (shareInsertRows?.length ?? 0) === 0),
  );

  const { data: shareUpdateRows, error: shareUpdateError } = await bob.from("document_shares")
    .update({ permission: "editor" }).eq("document_id", documentId)
    .eq("shared_with", bobAuth.user.id).select("id");
  record("Bob editor cannot modify shares", shareUpdateError === null && (shareUpdateRows?.length ?? 0) === 0);

  const { data: carolRows, error: carolReadError } = await carol
    .from("documents").select("id").eq("id", documentId);
  record("Carol never sees the document", !carolReadError && carolRows.length === 0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  record("RLS verification setup and execution", false, message);
} finally {
  if (documentId) {
    const { error } = await admin.from("documents").delete().eq("id", documentId);
    if (error) console.error(`Cleanup warning: ${error.message}`);
  }
}

const failures = results.filter((result) => !result.passed).length;
console.log(`\n${results.length - failures}/${results.length} assertions passed.`);
if (failures > 0) process.exitCode = 1;
