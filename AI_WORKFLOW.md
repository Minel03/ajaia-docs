# AI workflow

## Tools used

- **ChatGPT**: used at the start to understand the assessment brief and requirements. [CONFIRM: add what you asked it]
- **Claude**: used as a senior-engineer partner and reviewer. It helped me critique the proposed stack, identify the biggest risks (RLS recursion, editor privilege escalation, autosave races), plan a seven-milestone sequence, write scoped prompts for the coding agent, and diagnose errors I pasted in.
- **Codex**: used as the coding agent to implement each milestone. It was given narrow, one-milestone-at-a-time prompts and a project rules file (`AGENTS.md`) with the constraints (RLS is the real enforcement, Zod on all input, service role key never in the client, don't change the schema without asking).

## How AI accelerated development

- Scaffolding the Next.js app, Supabase clients, session handling, and the login flow.
- Drafting the schema, triggers, and RLS policies, which I then tested instead of trusting.
- Generating the dashboard, the Tiptap editor with serialized autosave, the TXT/Markdown importer, and the share dialog.
- Writing the pure-function unit tests and the RLS verification script.
- Debugging: pasting an error and getting a likely root cause quickly saved the most time.

Splitting the work into milestones kept each change small enough to review and verify before building on top of it.

## Suggestions I modified or rejected

- **Node version warning:** the AI first described the Node 20 warning from the Supabase client as harmless. It wasn't: the seed script failed on a missing native WebSocket. I upgraded to Node 22 and pinned it with `engines` in `package.json`.
- **Top-level await error in scripts:** I renamed the scripts to `.mts` instead of adding `"type": "module"` to the whole project, which could have broken Next.js tooling.
- **RLS policy bug:** the generated policies made owner inserts fail, because `INSERT ... RETURNING` has to pass the SELECT policy, and a stable helper function can't see the row being inserted. I changed the policies to check `owner_id = auth.uid()` directly.
- **Next.js 16 `Date.now()` prerender error:** I kept Cache Components on and fixed it with `await connection()` before auth, instead of disabling the feature or caching user data.
- **Supabase join shape:** the Shared with Me page crashed because a many-to-one relation came back as an object, not an array. I added a shared `firstRelation` helper instead of casting types.
- **Editor typing bug:** the agent said it fixed the problem from reading the code without reproducing it. I verified in the browser myself. [CONFIRM: describe the result]
- **Scope I deliberately left out:** real-time collaboration, comments, version history, and extra roles. I spent the time on correctness, security, and documentation instead.
- **Security decisions I kept:** no service role key in Vercel, no larger Server Action body limit (imports are capped at 500 KB), and imported Markdown is treated as untrusted.

## How I verified AI-generated code

- **Reading the SQL** before running any migration.
- **`npm run verify:rls`**: an integration script that signs in as three users and checks 10 assertions. It tests the negative cases, not only the happy paths: a non-shared user can't read, a viewer can't update, an editor can't change the owner, delete the document, or modify shares.
- **`npm test`**: 20 Vitest tests covering the import converter (including a script-injection case), validation rules, and role capabilities.
- **`npm run lint`, `npx tsc --noEmit`, and `npm run build`** after each milestone.
- **Manual two-user testing** (Alice and Bob in separate sessions) of create, edit, import, share, permission changes, and removal. [CONFIRM]
- **Testing on the deployed URL** in a private window. [CONFIRM after deploying]
- **Not covered by automated tests:** server actions against a live project and browser behavior. These were checked manually.
