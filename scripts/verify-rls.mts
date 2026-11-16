import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function formatThrown(value: unknown): string {
  if (value instanceof Error) {
    const stack = value.stack ? `\nstack: ${value.stack}` : "";
    const cause = "cause" in value && value.cause !== undefined
      ? `\ncaused by: ${formatThrown(value.cause)}`
      : "";
    return `message: ${value.message}${stack}${cause}`;
  }

  if (typeof value === "object" && value !== null) {
    const error = value as Record<string, unknown>;
    if (["message", "code", "details", "hint"].some((key) => key in error)) {
      return ["message", "code", "details", "hint"]
        .map((key) => `${key}: ${error[key] === undefined ? "(none)" : stringify(error[key])}`)
        .join("; ");
    }
  }

  return stringify(value);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_PASSWORD ?? "DemoPass123!";

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  const error = new Error(`Missing required environment variables: ${missing.join(", ")}. Set them in .env.local.`);
  console.error(`FAIL Setup: environment configuration - ${formatThrown(error)}`);
  process.exit(1);
}

function userClient(): SupabaseClient {
  return createClient(supabaseUrl!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const admin = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const results: Array<{ name: string; passed: boolean; detail?: string }> = [];

function record(name: string, passed: boolean, detail?: unknown) {
  const formattedDetail = !passed && detail !== undefined ? formatThrown(detail) : undefined;
  results.push({ name, passed, detail: formattedDetail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${formattedDetail ? ` - ${formattedDetail}` : ""}`);
}

class SetupStepError extends Error {
  constructor(readonly step: string, cause: unknown) {
    super(`Setup step failed: ${step}`, { cause });
    this.name = "SetupStepError";
  }
}

async function setupStep<T>(name: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new SetupStepError(name, error);
  }
}

async function signedIn(email: string) {
  const client = userClient();
  const { error } = await client.auth.signInWithPassword({ email, password: demoPassword });
  if (error) throw error;
  return client;
}

let documentId: string | null = null;

try {
  const alice = await setupStep("sign in as Alice", () => signedIn("alice@demo.test"));
  const bob = await setupStep("sign in as Bob", () => signedIn("bob@demo.test"));
  const carol = await setupStep("sign in as Carol", () => signedIn("carol@demo.test"));

  const [aliceUser, bobUser, carolUser] = await Promise.all([
    setupStep("load Alice's authenticated user", async () => {
      const { data, error } = await alice.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Alice session did not contain an authenticated user.");
      return data.user;
    }),
    setupStep("load Bob's authenticated user", async () => {
      const { data, error } = await bob.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Bob session did not contain an authenticated user.");
      return data.user;
    }),
    setupStep("load Carol's authenticated user", async () => {
      const { data, error } = await carol.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Carol session did not contain an authenticated user.");
      return data.user;
    }),
  ]);

  documentId = await setupStep("Alice creates the test document", async () => {
    const { data: document, error: createError } = await alice
      .from("documents")
      .insert({ owner_id: aliceUser.id, title: `RLS verification ${new Date().toISOString()}` })
      .select("id")
      .single();
    if (createError || !document) throw createError ?? new Error("No document row was returned.");
    return document.id;
  });
  record("Alice creates a document", true);

  const { data: bobBeforeShare, error: bobBeforeShareError } = await bob
    .from("documents").select("id").eq("id", documentId);
  record("Bob cannot read Alice's unshared document", !bobBeforeShareError && bobBeforeShare.length === 0,
    bobBeforeShareError ?? { message: `Expected zero rows; received ${bobBeforeShare.length}.` });

  await setupStep("Alice grants Bob viewer access", async () => {
    const { error } = await alice.from("document_shares").insert({
      document_id: documentId, shared_with: bobUser.id, permission: "viewer",
    });
    if (error) throw error;
  });

  const { data: bobViewerRead, error: viewerReadError } = await bob
    .from("documents").select("id").eq("id", documentId);
  record("Bob can read the viewer-shared document", !viewerReadError && bobViewerRead.length === 1,
    viewerReadError ?? { message: `Expected one row; received ${bobViewerRead.length}.` });

  const { data: viewerUpdateRows, error: viewerUpdateError } = await bob
    .from("documents").update({ content: { type: "doc", content: [{ type: "text" }] } })
    .eq("id", documentId).select("id");
  record("Bob viewer update affects zero rows", !viewerUpdateError && viewerUpdateRows.length === 0,
    viewerUpdateError ?? { message: `Expected zero rows; received ${viewerUpdateRows.length}.` });

  await setupStep("Alice upgrades Bob to editor", async () => {
    const { data, error } = await alice.from("document_shares")
      .update({ permission: "editor" }).eq("document_id", documentId).eq("shared_with", bobUser.id)
      .select("id");
    if (error) throw error;
    if (data.length !== 1) throw new Error(`Expected to update one share; updated ${data.length}.`);
  });

  const { data: editorUpdateRows, error: editorUpdateError } = await bob
    .from("documents").update({ content: { type: "doc", content: [{ type: "paragraph" }] } })
    .eq("id", documentId).select("id");
  record("Bob editor can update document content", !editorUpdateError && editorUpdateRows.length === 1,
    editorUpdateError ?? { message: `Expected one updated row; received ${editorUpdateRows.length}.` });

  const { error: ownerChangeError } = await bob.from("documents")
    .update({ owner_id: bobUser.id }).eq("id", documentId);
  record(
    "Bob editor cannot change document owner",
    ownerChangeError?.code === "P0001" && ownerChangeError.message.includes("owner cannot be changed"),
    ownerChangeError ?? { message: "Expected the owner immutability trigger to reject the change." },
  );

  const { data: editorDeleteRows, error: editorDeleteError } = await bob.from("documents")
    .delete().eq("id", documentId).select("id");
  record("Bob editor cannot delete document", !editorDeleteError && editorDeleteRows.length === 0,
    editorDeleteError ?? { message: `Expected zero deleted rows; received ${editorDeleteRows.length}.` });

  const { data: shareInsertRows, error: shareInsertError } = await bob.from("document_shares")
    .insert({ document_id: documentId, shared_with: carolUser.id, permission: "viewer" })
    .select("id");
  record(
    "Bob editor cannot insert shares",
    shareInsertError?.code === "42501" || (shareInsertError === null && (shareInsertRows?.length ?? 0) === 0),
    shareInsertError ?? { message: `Expected share insert to be denied; received ${(shareInsertRows ?? []).length} rows.` },
  );

  const { data: shareUpdateRows, error: shareUpdateError } = await bob.from("document_shares")
    .update({ permission: "editor" }).eq("document_id", documentId)
    .eq("shared_with", bobUser.id).select("id");
  record("Bob editor cannot modify shares", shareUpdateError === null && (shareUpdateRows?.length ?? 0) === 0,
    shareUpdateError ?? { message: `Expected zero updated shares; received ${(shareUpdateRows ?? []).length}.` });

  const { data: carolRows, error: carolReadError } = await carol
    .from("documents").select("id").eq("id", documentId);
  record("Carol never sees the document", !carolReadError && carolRows.length === 0,
    carolReadError ?? { message: `Expected zero rows; received ${carolRows.length}.` });
} catch (error) {
  record(error instanceof SetupStepError ? error.message : "RLS verification execution failed", false, error);
} finally {
  if (documentId) {
    const { error } = await admin.from("documents").delete().eq("id", documentId);
    if (error) {
      console.error(`FAIL Cleanup: remove test document - ${formatThrown(error)}`);
      process.exitCode = 1;
    }
  }
}

const failures = results.filter((result) => !result.passed).length;
console.log(`\n${results.length - failures}/${results.length} assertions passed.`);
if (failures > 0) process.exitCode = 1;
