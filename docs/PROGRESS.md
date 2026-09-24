# Progress

## Done
- [1/16] Project scaffold: Next.js 16 (App Router, TS), Tailwind v4, shadcn/ui, DESIGN.md tokens wired into `app/globals.css`, Plus Jakarta Sans font, `npm run build` passes.
- [2-3/16] Supabase migration `supabase/migrations/0001_init.sql`: all tables, exclusion constraints (physio + patient overlap), `is_admin()`, triggers (profile-on-signup, updated_at, appointment audit), full RLS. `supabase/seed.sql`: 4 physiotherapists, Mon-Fri 08:00-17:00 availability.
- [4/16] Google auth flow: `lib/supabase/{client,server,admin}.ts`, `proxy.ts` (Next.js 16 renamed "middleware" to "proxy" — migrated) protecting `/book`, `/appointments`, `/admin` (role check for `/admin`), `app/auth/callback/route.ts` exchanging the PKCE code and storing Google tokens in `google_tokens`, `app/actions/auth.ts` (signInWithGoogle/signOut server actions), real landing page with working sign-in button.

- [5/16] `lib/slots.ts` + `lib/tz.ts`, tested in `tests/slots.test.ts` (10 tests: normal day, last-slot 16:15 boundary, partially/fully booked, time-off overlap, today-with-passed-times, past-date rejection, DST-shifting-zone UTC proof). Bumped `@types/node` to `^22` to match the installed Node 22 runtime and satisfy Vitest 5's peer dependency.

- [6/16] Physiotherapist chooser screen: `app/book/page.tsx` (server component, fetches active physiotherapists), `components/booking/PhysioCard.tsx`, `app/book/loading.tsx` skeleton, empty/error states. Responsive 1/2/3-column grid.

- [7/16] Date and slot picker: `GET /api/availability` (service-role read — RLS would otherwise hide other patients' bookings from the availability calculation), `components/booking/{DayStrip,SlotGrid,SummaryBar,SlotPicker}.tsx`, `app/book/[physioId]/page.tsx`. Day-strip pattern per DESIGN.md (not the spec's literal "month view" — DESIGN.md wins on UI shape).

- [8/16] Booking creation + confirmation: `lib/validation.ts` (+ `tests/validation.test.ts`, 14 tests) tested first, `POST /api/appointments` (re-validates past/grid/availability server-side, catches the Postgres exclusion-violation race as a 409), `/book/[physioId]/confirm` + `ConfirmForm`, `/book/success`. `lib/reference.ts` derives a display reference from the appointment id (no `reference` column in the spec's schema).

- [9/16] Formspree notifications: `lib/notify.ts` (retries once, never throws, logs and no-ops if `FORMSPREE_ENDPOINT`/`RECEPTION_EMAIL` are unset), wired into `POST /api/appointments` on booking creation.

- [10/16] Google Calendar: `lib/google-calendar.ts` (createEvent/updateEvent/deleteEvent, token refresh, revoked-grant cleanup), wired into `POST /api/appointments` — stores `google_event_id` on success, silently skips (never fails the booking) if the patient declined the scope or the API call fails.

- [11/16] `/appointments`: `GET /api/appointments/me` (upcoming/past split), `PATCH`/`DELETE /api/appointments/[id]` (reschedule re-validates everything POST does, excluding the appointment's own current slot from the overlap check; cancel is soft, deletes the calendar event, notifies both parties). UI: `AppointmentsTabs`, `AppointmentCard`, `RescheduleDialog` (reuses `DayStrip`/`SlotGrid`), `CancelDialog` (shadcn `Dialog`, added via `npx shadcn add dialog`), `StatusBadge`.

- [12/16] Admin dashboard + appointments table: `lib/auth.ts` (`requireAdmin()` — proxy.ts's matcher doesn't cover `/api/admin/*`, so each admin API route re-checks the role itself), `/admin` stat tiles (today, this week, cancellations this month, per-physio load this week), `GET /api/admin/appointments` (paginated, no filters yet), `/admin/appointments` table with mobile card collapse. Read-only — edit/cancel/export land in step 13.

- [13/16] Admin edit, filters, Excel export: `PATCH /api/appointments/[id]` now branches on admin role (status/notes-only edits vs. full time/physio reschedule, sharing the same re-validation path); `lib/admin-appointments.ts` + `lib/excel.ts` shared between `GET /api/admin/appointments` (filters: date range, physio, status, free-text on patient name/email via `.or(..., {foreignTable})`; sortable; paginated) and `GET /api/admin/export` (same filters, no pagination, streams `.xlsx` — bold frozen header, auto-width, `appointments_<from>_to_<to>.xlsx`). Added `GET /api/physiotherapists` (spec route existed on paper, not yet built). UI: `Filters`, `ExportButton`, `EditDialog` (status + notes), inline Reschedule/Mark completed/Mark no-show/Cancel reusing existing dialogs. Fixed a real bug along the way: patient notification email was sourced from the caller's own session, which broke once admins could act on a patient's behalf.

- [14/16] Admin physio/availability/audit: `supabase/migrations/0002_storage.sql` (public `physio-photos` bucket, admin-write RLS); `/admin/physiotherapists` (add/edit/deactivate — never hard-delete, photo upload straight to Supabase Storage from the browser); `/admin/availability` (weekly rules editor + time-off add/remove, per physio); `/admin/audit` (read-only paginated feed). New admin API routes: physiotherapists CRUD, availability PUT (delete+reinsert), time-off POST/DELETE, audit GET.

- [15/16] Responsive and accessibility pass: automatic dark mode (pre-hydration script sets `.dark` from `prefers-color-scheme`, since nothing was toggling the class before); global `:focus-visible` outline in `app/globals.css` so every interactive element gets DESIGN.md's 2px azure ring, not just the ones I remembered to style individually; loading skeletons added for `/book/[physioId]` and `/appointments`; distinct error states (vs. silently falling back to "empty") in the admin appointments table; dropped `backdrop-blur` from the shadcn dialog scrim; fixed a real AA contrast failure in DESIGN.md's own `state.warn` hex plus a few small `text-azure` UI links that were under 4.5:1 on light grounds. Ran DESIGN.md's self-audit checklist (banned colours, shadow/blur, `rounded-full` misuse) across the whole codebase — clean otherwise.

- [16/16] `README.md` (local setup, Supabase project creation, Google OAuth client setup with exact redirect URIs/scopes, Formspree, promoting a user to admin, migrations/seed, tests, Vercel deploy) and `.env.example`. All 16 build-order steps complete — see `DECISIONS.md` for every judgement call, `docs/BACKLOG.md` for deferred nice-to-haves.

## In flight
- Nothing. Build order complete.

## Live verification run (2026-09-24)
- `npm test`: 24/24 pass. `npm run build`: clean.
- Started the dev server and hit it directly: landing page renders ("Sign in with Google", "Need physio" both present); `/book`, `/appointments`, `/admin` all 307-redirect to `/` when signed out (proxy.ts working); `/api/appointments/me`, `/api/admin/appointments`, `/api/physiotherapists`, `POST /api/appointments` all return 401 without a session (route-level auth checks working independent of the page-level redirect).
- Confirmed via a direct REST call that **the migration has not been pushed to the live Supabase project yet** — `public.physiotherapists` doesn't exist there (`PGRST205`). This is the same item already listed under "Blocked / needs you" below; it means no real end-to-end flow (sign-in → booking → calendar/email) can be exercised until you run `supabase db push`.
- **Update:** the Chromium download had actually been running in the background the whole time (~707MB, just slow on this network) and completed after the above was written. Re-ran with a real headless browser: landing page renders correctly (Plus Jakarta Sans, azure pill button, no console errors), all three protected routes visually confirmed redirecting to `/` when signed out, and no horizontal scroll at a 360px viewport. Screenshot review caught one real gap: the hero heading was hardcoded to DESIGN.md's *mobile* size (44px) at every breakpoint, never scaling to the *desktop* size (60px) the same table specifies — fixed with a `lg:` variant in `app/page.tsx`. `playwright` stays as a devDependency for future real browser testing.

## Blocked / needs you (can't be done from here)
- Applying the migration to the live Supabase project (`npx supabase link --project-ref peipcienooeqqhoprsnn` then `npx supabase db push`, or `npx supabase db reset` if Docker is running) needs your own `supabase login` (interactive access token) — see README section 5.
- `RECEPTION_EMAIL` is blank in `.env`. Notifications work for the patient copy; the reception copy is skipped (logged, not fatal) until you set it.
- Actually deploying to Vercel and registering the Google OAuth client needs your own accounts — README sections 3 and 8 walk through both exactly.
- Full end-to-end click-through (real Google sign-in, real calendar event, real email) needs the above set up first; `npm run build` and `npm test` have been the verification loop throughout since there's no live backend to hit yet.

## Decisions made this session
See `DECISIONS.md` at project root.

## Redesign track (2026-09-24, in flight)
- [1/4] Admin shell (light rounded container + pill nav) and weekly calendar view (`AdminCalendar`, Calendar/Table toggle) — done, build + 24 tests pass.
- [2/4] Admin spec gaps: sortable table columns UI, admin creates a booking, change physiotherapist in Edit.
- [3/4] Client split view: doctors list left, weekly availability calendar right, no page change.
- [4/4] Remaining spec gaps: calendar retry flag, calendar status on success screen, toast warnings, overlap tests.
