# Project

Ajaia Docs is a lightweight Google Docs-style editor for a 4-6 hour take-home assessment. Stack: Next.js 16 App Router, strict TypeScript, Tailwind CSS, shadcn/ui, Tiptap v3, Supabase (Postgres, Auth, RLS), Zod, Vitest, and Vercel deployment. Target Node.js 22+.

# Working rules

- Work on one milestone or task at a time. Do not implement features outside the current task.
- Keep solutions simple: no extra abstractions, state libraries, or separate API layer. Use Server Actions or route handlers.
- Enforce authorization in RLS and check it server-side. Hiding UI is never security. If an update or delete affects zero rows, return a clear permission error, not silent success.
- Never expose the Supabase service role key to client code or use a `NEXT_PUBLIC_` variable for it. Use it only in local scripts; never set it in Vercel.
- Validate external input with Zod. Shared server-action validators live in `lib/validation.ts`, and import file validation lives in `lib/import/validate-file.ts`. Login credentials use a local Zod schema.
- Do not change the schema or RLS without asking. Put schema changes in a new numbered migration in `supabase/migrations/`; never edit an applied migration.
- If a decision has tradeoffs or you are unsure, ask before choosing.
- Do not run scripts that touch the live Supabase project (`seed` or `verify:rls`). Tell the user the command so they can run it.

# Next.js 16 conventions (`cacheComponents` is enabled)

- Every authenticated page or layout that reads the session must render inside a `Suspense` boundary and call `await connection()` from `next/server` before creating the Supabase server client or calling auth.
- Never use `"use cache"` for code that reads user data.
- Supabase many-to-one joins can be objects or arrays. Normalize them with `firstRelation` from `lib/first-relation.ts`.
- Store and load Tiptap content as JSON, never HTML. Use `immediatelyRender: false` with Tiptap.
- StarterKit v3 already includes Underline; do not register it twice. Define shared extensions in `lib/tiptap-extensions.ts`.

# Commands

Run npm scripts with `npm run <name>` (or `npm test`):

- `dev`: `next dev`
- `build`: `next build`
- `lint`: `eslint`
- `test`: `vitest run --configLoader runner` (pure unit tests; no Supabase project required)
- `test:rls`: alias for `verify:rls`
- `verify:rls`: `tsx scripts/verify-rls.mts` (live Supabase RLS integration test)
- `seed`: `tsx scripts/seed.mts`

The seed and verification scripts are `.mts` files run with `tsx`. The verification script also uses the service role key to clean up its test document.

# Definition of done

After each change, run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`. Then summarize what changed, what could break, and how to verify it manually.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
