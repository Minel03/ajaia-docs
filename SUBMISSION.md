# Ajaia Docs: Submission

## Links

- **Live app:** https://ajaia-docs-eight-lilac.vercel.app/
- **Walkthrough video:** [video URL]
- **Source code (also in the Drive folder):** https://github.com/Minel03/ajaia-docs

## Demo accounts

Password for all: `DemoPass123!`

- alice@demo.test: owns the sample document "[title]"
- bob@demo.test: editor on Alice's sample document
- carol@demo.test: viewer on Alice's sample document

Suggested review flow: log in as Alice, open the sample document and the Share dialog; then log in as Bob or Carol (private window) to see it under "Shared with Me" with the matching permissions.

## What's included in this Drive folder

- `source-code.zip`: source code (no node_modules or .env files)
- `README.md`: local setup and run instructions
- `ARCHITECTURE.md`: architecture note
- `AI_WORKFLOW.md`: AI workflow note
- `SUBMISSION.md`: this file
- `video-url.txt`: walkthrough video URL
- `screenshots/`: [list what you include]

## What's working

- Create, rename, edit, and delete documents; autosave with a save-status indicator
- Rich text: bold, italic, underline, H1-H3, bulleted and numbered lists, undo/redo
- Persistence in Supabase Postgres, with content stored as Tiptap JSON so formatting survives refresh
- Import of `.txt` and `.md` files (max 500 KB) into new editable documents
- Ownership and sharing by email with Viewer and Editor permissions
- Dashboard with My Documents, Shared with Me, and Recent
- Authorization enforced in Postgres RLS and re-checked in Server Actions
- 20 Vitest unit tests plus an RLS integration script (10 assertions)

## Incomplete / deliberately not built

Real-time collaboration, comments, version history, search, and export. I cut these to put the time into correctness, security, and documentation.

## Known limitations

- Autosave is last-write-wins, with no real-time sync
- A role change applies in an already-open editor only after refresh (RLS still blocks unauthorized writes)
- Authenticated users can look up other profiles by exact email, which sharing by email relies on

## If I had another 2-4 hours

- Markdown/PDF export
- Version history (snapshots with restore)
- Presence indicators and real-time sync to replace last-write-wins
- Live permission updates in open editors
- Server Action integration tests and end-to-end tests of login, import, and sharing

## Run locally and test

See README.md. Short version: Node 22+, `npm ci`, copy `.env.example` to `.env.local`, run `supabase/migrations/0001_init.sql` in the Supabase SQL editor, `npm run seed`, `npm run dev`. Tests: `npm test` (unit) and `npm run verify:rls` (permission integration).

## AI use (summary)

ChatGPT to understand the brief, Claude as planner and reviewer, Codex as the coding agent. Details in AI_WORKFLOW.md.
