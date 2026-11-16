# Architecture

## What I prioritized and why

With a 4-6 hour limit, I put depth into reliable persistence, access control enforced in the database rather than only in the UI, a usable editor with safe autosave, and import that treats uploaded files as untrusted. I deliberately skipped real-time collaboration, comments, and version history, because each needs its own conflict-handling and storage decisions and would have cut into correctness and testing.

## Stack and choices

- **Next.js 16 App Router and React** provide server-rendered pages, route layouts, and Server Actions in one app.
- **TypeScript** checks application and script code; **Tailwind CSS** and the installed shadcn/ui components provide styling and accessible controls.
- **Supabase Auth and Postgres** provide password authentication and persistent data. `@supabase/ssr` shares the auth session between the browser, server components, and request proxy.
- **Postgres RLS** is the data authorization boundary. Server Actions use the user's Supabase session and validate inputs with **Zod**.
- **Tiptap** edits and stores structured JSON rather than HTML. **Marked** parses Markdown imports, and `@tiptap/html/server` converts supported output into the shared Tiptap schema.
- **Vitest** tests deterministic pure functions. The separate `verify-rls` script checks policies against a live Supabase project.

The app deliberately has no client state library, separate API service, real-time sync layer, or editor collaboration provider. Search, comments, and document history are also not implemented.

## Data model

The SQL schema is in `supabase/migrations/0001_init.sql`.

| Table | Purpose and important fields |
| --- | --- |
| `profiles` | One row per `auth.users` account. `id` references the auth user; `email` is unique; `full_name` is optional. An auth-user trigger creates the profile. |
| `documents` | Document `id`, 1-200 character `title`, Tiptap JSON `content`, `owner_id`, and timestamps. An update trigger refreshes `updated_at` and rejects owner changes. |
| `document_shares` | A document-to-profile grant with `viewer` or `editor` permission. `(document_id, shared_with)` is unique. The database rejects sharing with the owner. |

Documents and shares cascade-delete with their referenced owner/profile or document. Indexes cover document owner, share recipient, and shared document.

## Permission model

| Action | Owner | Editor | Viewer |
| --- | :---: | :---: | :---: |
| Read document | Yes | Yes | Yes |
| Edit content | Yes | Yes | No |
| Rename document | Yes | Yes | No |
| Delete document | Yes | No | No |
| Add, change, or remove shares | Yes | No | No |

All signed-in users can create documents owned by themselves. The permission is stored in `document_shares`; no share row means a non-owner has no document access.

## Authorization layers

1. **RLS is the enforcement boundary.** Policies gate reads and writes in Postgres even if a caller bypasses the UI or invokes an action directly.
2. **Server Actions validate and report results.** Zod validates IDs, titles, permissions, content shape, and import fields. Actions use the authenticated Supabase client and check returned rows so a zero-row write becomes a permission error.
3. **The UI is a hint.** It hides controls from viewers and non-owners for clarity, but it does not grant access. The server page supplies the role used for these display decisions.

The `is_document_owner`, `can_view_document`, and `can_edit_document` SQL helpers are `SECURITY DEFINER`, `STABLE`, and set `search_path = public`. They use `auth.uid()` and read the related tables outside the caller's RLS evaluation, preventing recursive policy evaluation between `documents` and `document_shares`.

## Authentication and routing

The browser and server Supabase clients use the public project URL and anon key. The request proxy refreshes Supabase sessions. It redirects unauthenticated requests to `/login` and authenticated users away from `/login` and `/` to `/dashboard`; authenticated pages also check the user server-side.

With Next.js 16 `cacheComponents` enabled, session-dependent async page content calls `await connection()` before creating the server client or reading auth, and is rendered under a `Suspense` boundary. This keeps request-specific data out of the prerendered shell.

The document route calls `notFound()` when the ID is invalid, the document is invisible under RLS, or the caller has no share. That lookup is inside a Suspense boundary and happens after `connection()`. If streaming has already begun, Next.js renders the not-found UI with HTTP 200; if not, it can return HTTP 404. Both cases include `noindex` metadata. This is the streaming status behavior described by the installed Next.js docs, not a special status check in the app.

## Editor and autosave

The editor uses `immediatelyRender: false` and stores `editor.getJSON()` output. Content changes mark the editor unsaved and schedule a save after about one second without further input. Saves run one at a time; if more changes arrive during a save, the latest content is sent in a follow-up save. The editor attempts to flush pending changes when the tab becomes hidden and on component cleanup. `beforeunload` warns while changes remain unsaved. The server action enforces a 1 MB serialized JSON limit.

The model is last-write-wins across separate sessions. It does not merge concurrent changes or notify another open editor in real time.

## Import pipeline

The import Server Action checks the uploaded file server-side; it does not trust the browser MIME type. It accepts `.txt` and `.md` case-insensitively, limits files to 500 KB, rejects empty/whitespace files and null bytes, decodes fatal UTF-8, and strips a UTF-8 BOM. It then converts the text to Tiptap JSON and enforces a 1 MB serialized content limit.

TXT blank lines split paragraphs and single line breaks become hard breaks. Markdown is parsed with Marked and converted with the same Tiptap extensions as the editor. Raw HTML tokens are dropped before HTML-to-JSON parsing so script tags and event attributes cannot be stored. Images become text; tables and code blocks become plain text. An H1 supplies the Markdown title; otherwise the filename supplies the title, capped at 200 characters.

## Testing strategy

- `npm test` runs fast Node-only tests for import conversion, validation, and role-to-UI capability decisions. They do not use Supabase, Next.js, environment variables, or network access.
- `npm run verify:rls` (also `npm run test:rls`) is a live integration check. It signs in as Alice, Bob, and Carol, exercises document and share policies, reports each assertion, and removes the test document afterward when cleanup succeeds. It requires the Supabase environment variables and seeded demo users; it is not part of Vitest.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` check lint, types, and production compilation.

## Limitations and tradeoffs

- The `profiles` SELECT policy permits any authenticated user to read profile rows, including email addresses. Sharing uses exact email lookup and currently depends on that policy.
- A role change is enforced by RLS immediately for later requests, but an already-open editor can retain stale role-based controls until refreshed. The UI role is not the security boundary.
- Concurrent writes are last-write-wins. There is no operational transform, CRDT, or real-time update channel.
- Markdown features outside the editor's schema are simplified or dropped during import.
- The RLS verification script checks selected policy cases against the configured Supabase instance; it is not exhaustive database security coverage.

## With more time

- Revisit profile discovery so sharing does not require exposing every authenticated user's email through profile reads.
- Add multi-session tests for role changes and concurrent edits, plus end-to-end coverage of login, import, and sharing.
- If collaborative editing becomes a requirement, define a conflict-resolution and presence model before adding real-time synchronization.
- Add document history only after defining retention, restore behavior, and storage costs.
