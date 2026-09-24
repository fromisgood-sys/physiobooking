# CLAUDE.md — Physiotherapy Booking App

Read this at the start of every session. It is the contract for how we work.

---

## Project

Responsive booking app for a physiotherapy clinic. Patients sign in with Google, pick a physiotherapist, book a 45-minute session, get an email and a Google Calendar entry. A receptionist logs in as admin to manage and export everything.

Full requirements live in `physio-booking-app-spec.md`. Read it once at the start of a session, not repeatedly.

**Stack:** Next.js (App Router, TypeScript) · Tailwind + shadcn/ui · Supabase (Postgres, RLS, Auth) · Google Calendar API v3 · Formspree for email · `exceljs` for export · `date-fns` / `date-fns-tz` · Vercel

---

## Working agreement (read this before anything else)

I have ADHD. Long unbroken stretches of work and walls of output are where I lose the thread. Work with that, not against it.

**Work in one small, shippable chunk at a time.**
- One task per turn. Finish it, verify it, stop.
- Never chain five unrelated changes into one response.
- If a task turns out to be bigger than expected, stop and split it rather than pushing through.

**Always tell me exactly where we are.**
Start every response with a single status line, nothing more:
`[3/9] Slot generator — building lib/slots.ts`

**End every chunk with a checkpoint block.** Exactly this shape, nothing longer:
```
DONE: what changed, in one line
VERIFY: the one command I run, or the one thing I click
NEXT: the single next task
```

**Keep chat output small.**
- Plans, specs, audits, and long analysis go into a `.md` file in `docs/`. Do not print them into the chat.
- Do not paste a whole file back to show me a three-line change. Show the diff.
- No preamble, no "Great question!", no recap of what I just said.

**Never guess when I have been ambiguous.** Stop and give me 2–3 concrete lettered options with a recommendation. A wrong guess costs me an hour of re-reading; a question costs ten seconds.

**Maintain `docs/PROGRESS.md`** after every completed chunk: what is done, what is in flight, what is next, and any decision made. This is how I pick the project back up after three days away. Update it before I have to ask.

**Do not scope-creep.** If you spot something worth doing that I did not ask for, add a line to `docs/BACKLOG.md` and carry on. Do not build it.

---

## Token and context discipline

Context fills fast and quality drops as it does — this is the constraint most of these rules exist to manage.

- **Search before reading.** Use `rg` / `grep` / `sed -n '120,180p'` to pull the lines you need. Do not read a 500-line file to change 20 lines.
- **Do not re-read files already in context.** If you read it this session, you still have it.
- **Bash over file reads** for anything a command can answer (`ls`, `rg -l`, `git diff --stat`, `npm test 2>&1 | tail -30`).
- **Truncate command output.** Pipe long output through `tail`, `head`, or `grep`. Never dump a full install log or a full test run.
- **Write long artefacts to files, not to the chat.**
- **One purpose per session.** When I say `/clear`, the topic has changed — do not try to carry the old thread forward.
- **`/compact` at natural boundaries**, not mid-task.

---

## Verification — non-negotiable

Every chunk must end with something that returns a pass or fail. "Looks done" is not a signal; without a check that closes the loop, I become the verification loop, and that is exactly what I am trying to avoid.

- Business logic (slot generation, overlap, timezone, validation) gets a Vitest test **written before the implementation**.
- UI changes get a specific instruction: which URL, which click, what I should see.
- Run `npm run build` before declaring any chunk complete. A passing dev server is not a passing build.
- Never tell me something works if you have not run the check.

---

## Non-negotiable domain rules

These come from the spec and must be enforced **server-side**, not just in the UI:

1. Sessions are exactly 45 minutes. Not configurable by the user.
2. Bookable 08:00–17:00 clinic local time. Last start is **16:15** so the session ends by 17:00.
3. Past dates and past times are rejected. Disable in the picker *and* reject at the API.
4. No double-booking, guaranteed by a Postgres exclusion constraint — not by application logic alone.
5. All timestamps stored as UTC `timestamptz`. Rendered in `CLINIC_TZ` (`Africa/Windhoek`).
6. Email and Google Calendar failures must **never** roll back a successful booking. Try/catch, log, warn, return success.
7. `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_CLIENT_SECRET` are server-only. Never `NEXT_PUBLIC_`, never in a client component, never committed.
8. Cancellations are soft (`status = 'cancelled'`). Appointment history is never deleted.

---

## Design

All UI work follows `DESIGN.md`. Read it before writing any component. The short version: this must not look like it came out of an AI. No indigo, no purple-to-blue gradient, no Inter, no untouched shadcn defaults, no centred-hero-plus-three-cards.

---

## Commands

```bash
npm run dev        # local dev
npm run build      # must pass before any chunk is "done"
npm test           # vitest
npx supabase db push    # apply migrations
npx supabase db reset   # rebuild local db from migrations + seed
```

---

## Build order

Work through these in sequence. One at a time. Do not jump ahead.

1. Project scaffold, Tailwind, shadcn, design tokens from `DESIGN.md`
2. Supabase migration: tables, exclusion constraints, triggers, RLS
3. Seed data: 4 physiotherapists with Mon–Fri availability
4. Google auth flow + `profiles` trigger + middleware
5. `lib/slots.ts` + its tests (tests first)
6. Physiotherapist chooser screen
7. Date and slot picker
8. Booking creation + confirmation screen
9. Formspree notifications
10. Google Calendar create / update / delete
11. `/appointments` — history, reschedule, cancel
12. Admin dashboard + appointments table
13. Admin edit, filters, Excel export
14. Admin physiotherapist and availability management
15. Responsive and accessibility pass
16. Deploy to Vercel, production env vars, OAuth origins

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
