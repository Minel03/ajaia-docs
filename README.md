# Ajaia Docs

Ajaia Docs is a collaborative document editor with account-based access, document sharing, and plain text or Markdown import.

## Features

- Create, rename, and delete documents.
- Edit rich-text documents with headings, bold, italic, underline, lists, undo, and redo.
- Autosave document content as Tiptap JSON.
- Share documents with existing accounts as viewers or editors.
- Browse My Documents, Shared with Me, and the 10 most recently updated documents you can access.
- Import `.txt` and `.md` files up to 500 KB each.

## Stack

- Next.js 16 App Router, React, TypeScript, Tailwind CSS, and shadcn/ui components.
- Supabase Auth and Postgres with row-level security (RLS).
- Tiptap for editing and Markdown conversion; Zod for validation; Vitest for unit tests.

## Local setup

Requirements: Node.js 22 or newer and npm.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a Supabase project. In its SQL Editor, paste and run the complete contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates the tables, triggers, helper functions, indexes, and RLS policies.

3. Copy `.env.example` to `.env.local` and set the project values:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DEMO_PASSWORD=DemoPass123!
   NEXT_PUBLIC_DEMO_PASSWORD=DemoPass123!
   ```

   Keep `DEMO_PASSWORD` and `NEXT_PUBLIC_DEMO_PASSWORD` the same if you want the login quick-fill buttons to match the seeded accounts. The service role key is only used by local scripts.

4. Create or update the demo accounts:

   ```bash
   npm run seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

6. Run the pure unit tests and checks:

   ```bash
   npm test
   npm run lint
   npx tsc --noEmit
   ```

7. Run the live RLS integration check against the configured Supabase project:

   ```bash
   npm run verify:rls
   # Alias:
   npm run test:rls
   ```

   This requires the demo accounts, the project URL, anon key, and service role key. It creates a temporary document and removes it after the run.

## Demo accounts

The seed script creates or updates:

- `alice@demo.test`
- `bob@demo.test`
- `carol@demo.test`

The default password is `DemoPass123!`. `DEMO_PASSWORD` can override it for seeding; set `NEXT_PUBLIC_DEMO_PASSWORD` to the same value for quick fill on the login page.

## Deployment notes

Deploy the Next.js app on Vercel after applying the SQL migration and seeding the accounts in the Supabase project used by the deployment. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel. Set `NEXT_PUBLIC_DEMO_PASSWORD` only if the login quick-fill buttons should use a non-default demo password.

**Never add `SUPABASE_SERVICE_ROLE_KEY` to Vercel or browser-exposed variables.** It is needed only for local seed and RLS verification scripts. Keep it in a local `.env.local` file and out of version control.

## Project structure

```text
app/                     App Router pages, layouts, and server actions
components/              Dashboard, dialogs, editor, and UI components
lib/                     Supabase clients, validation, import, and editor helpers
samples/                 Example TXT and Markdown import files
scripts/                 Demo account seeding and RLS verification
supabase/migrations/     Database schema, triggers, functions, and RLS
```

## Not included

There is no real-time co-editing, comments, version history, or search. Concurrent edits use last-write-wins behavior.
