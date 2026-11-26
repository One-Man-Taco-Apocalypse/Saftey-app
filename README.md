# Saftey-app

Safety documents for crews: fill in forms (PSA, Harness Inspection, …), collect
signatures, request documents from people, and track everything on a dashboard.

Built with Next.js (app router, Cache Components) and Supabase (Postgres, Auth,
Storage, Realtime).

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
```

Needs `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

With Docker instead:

```bash
docker compose --env-file .env.local up --build
```

## Checking changes

| Command           | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `npm run check`   | Everything below except the database tests: run before committing |
| `npm run typecheck` | TypeScript                                                   |
| `npm run lint`    | ESLint                                                         |
| `npm test`        | Unit tests (`lib/**/*.test.ts`) and render tests (`components/**/*.test.tsx`) |
| `npm run test:watch` | Unit tests, re-running on save                              |
| `npm run test:db` | Runs every migration in an in-memory Postgres and checks the security rules (RLS, triggers, document numbers). Never touches the real database. |
| `npm run build`   | Production build                                               |

## Where things are

```
app/                      Pages (routes)
  dashboard/              Everything behind login
    documents/            List, view (/[submissionId]) and fill in (/new/[templateId])
  auth/                   Login, sign up, password reset

components/
  dashboard/              Dashboard cards ("modules"), popups, live refresh
    crew/                 Pieces of the Crew card
  documents/              Document form, signature pad/table, dropdowns
    form/                 One field's input / layout, the "Submitted" screen
    view/                 How each answer is shown on a finished document
  status-pill.tsx         Complete / Waiting / Requested badges
  ui/                     Basic shadcn/ui pieces (used by the auth pages)

lib/                      No UI here
  documents.ts            Types for templates, answers, signatures + small helpers
  forms.ts                Form rules: starting values, validation, what's saved,
                          which fields show on a finished document (pure, tested)
  crew-status.ts          Each crew member's status on each document (pure, tested)
  submit-document.ts      Saving a document from the browser (uploads + RPC)
  templates.ts, submissions.ts, signatures.ts, people.ts, projects.ts,
  settings.ts, crew-documents.ts, user.ts
                          Server-side database reads. Wrapped in React `cache`,
                          so a page asking twice only queries once.
  themes.ts               Theme list (colours are in app/globals.css)
  supabase/               Supabase clients (browser, server, proxy)

supabase/
  migrations/             Database changes, run in order in the Supabase SQL editor
  tests/                  Database tests (npm run test:db)
```

## Adding things

- **A new field type**: add it to `FieldType` in `lib/documents.ts`, draw its input
  in `components/documents/form/field-input.tsx`, its answer in
  `components/documents/view/answer-view.tsx`, and any save/validation rules in
  `lib/forms.ts`. Add it to `ALL_TYPES` in `components/documents/render.test.tsx`.
- **A new form (template)**: a migration that inserts into `document_templates` and
  `document_template_versions` (see `20261125000019_psa_template.sql`).
- **A new dashboard card**: a component in `components/dashboard/`, wrapped in
  `<Module size="…">`, added to `app/dashboard/page.tsx` inside a `<Suspense>`.
- **A new theme**: `lib/themes.ts` + a `[data-theme="…"]` block in `app/globals.css`
  (and `tailwind.config.ts` `darkMode` if it's dark).

## Temporary

The "Clear all document data" button on the Documents page is for testing only.
To remove it: delete `components/documents/clear-all-documents.tsx`, its
`<ClearAllDocuments />` on `app/dashboard/documents/page.tsx`, and run
`drop function if exists public.dev_clear_all_documents(text);`.
