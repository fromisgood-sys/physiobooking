# Progress

## Auth idle-session guard (2026-09-26)
- Confirmed the global idle guard is mounted; `/appointments` and `/admin` are protected by `proxy.ts`, and appointment/admin APIs independently check the caller.
- Updated the 30-minute idle timer so pointer movement counts as activity, auth refresh events cannot extend an idle session, and sign-out clears the timer.
- `npm.cmd run build` passes.
- Next requested chunk: audit mock/sample data and its schemas, then plan the required Supabase migration and rating-request flow for completed/cancelled appointments.

## Admin Create Appointment flow (2026-09-26)
- Replaced the page-leaving appointment link with a right-side modal Sheet and a three-step patient/details/review workflow; retained the existing Appointments page, navigation, filters and responsive admin shell.
- Added admin-only, rate-limited patient search, duplicate checks, international phone normalization, and patient-specific available slots. Reused `generateSlots`, `excludePatientConflicts`, clinic timezone/lead-time helpers and the database exclusion constraints.
- Added transactional booking/audit RPC support and migration `0006_admin_appointment_creation.sql`; new patients get a Supabase Auth profile without a password, and unused profiles are compensated if booking fails.
- Added email/calendar result feedback, admin audit feed/export support for new patient records, and a 500-character physiotherapist-comments field excluded from audit and email payloads.
- `npm.cmd test`: 41 tests pass. Focused lint: 0 errors, two image warnings. `npx.cmd tsc --noEmit` and production build pass. Whole-project lint still reports existing errors in unrelated files.
- Local Playwright smoke check passed for sheet render, steps, Escape, focus containment/restoration, unsaved-close warning, Google-only message, no password field, and 390px full-width/no-overflow layout. No patient or appointment was submitted.
- Migration is not applied to the Supabase project, so database-backed patient search, create/duplicate paths and full browser booking verification still require applying migrations.

## Admin appointment RPC error fix (2026-09-26)
- Diagnosed the screenshot's generic create failure from `.next/dev/logs/next-development.log`: `create_admin_appointment` returned PostgreSQL `42702` (ambiguous column `id`) because its `RETURNS TABLE` output name collided with an unqualified `profiles.id` in PL/pgSQL.
- Added migration `0007_fix_admin_appointment_creation.sql`, which replaces the function and qualifies profile references with aliases. The API now reports migration 0007 specifically if the old function still returns `42702`.
- `npm.cmd test` (41 tests), `npx.cmd tsc --noEmit`, `npm.cmd run build`, and focused route lint pass.
- Tried checking linked migration history with `npx.cmd supabase migration list`, but npx stalled while bootstrapping `supabase@2.118.0`; the live database migration could not be applied here. Apply migration 0007 to the linked Supabase project, then retry the appointment.

## Gmail SMTP notification routing (2026-09-26)
- Removed the Formspree fallback. All booking, reschedule, cancellation, and admin-edit emails now use server-side Gmail SMTP only.
- Sends separate messages to the patient (unless an admin opts out) and configured `RECEPTION_EMAIL`. Individual physiotherapists are not email recipients; their existing Google Calendar attendee invitations are unchanged.
- Added one retry per SMTP recipient and per-recipient results in admin and patient booking success flows. Missing SMTP configuration is reported without failing the appointment.
- The Vercel screenshot's `SMTP_USER`, `SMTP_PASSWORD`, and `RECEPTION_EMAIL` are Production-only; they do not configure `localhost`. Add those three values to local `.env` for local SMTP testing. Host/port/from have Gmail defaults.
- `tests/notify.test.ts` covers SMTP routing, no fallback, SMTP-off behavior, App Password normalization, retry, and reception delivery after patient-send failure. All 45 project tests pass; typecheck/build pass; touched-file lint has no errors.

## Done
- [1/16] Project scaffold: Next.js 16 (App Router, TS), Tailwind v4, shadcn/ui, DESIGN.md tokens wired into `app/globals.css`, Plus Jakarta Sans font, `npm run build` passes.
- [2-3/16] Supabase migration `supabase/migrations/0001_init.sql`: all tables, exclusion constraints (physio + patient overlap), `is_admin()`, triggers (profile-on-signup, updated_at, appointment audit), full RLS. `supabase/seed.sql`: 4 physiotherapists, Mon-Fri 08:00-17:00 availability.
- [4/16] Google auth flow: `lib/supabase/{client,server,admin}.ts`, `proxy.ts` (Next.js 16 renamed "middleware" to "proxy" — migrated) protecting `/book`, `/appointments`, `/admin` (role check for `/admin`), `app/auth/callback/route.ts` exchanging the PKCE code and storing Google tokens in `google_tokens`, `app/actions/auth.ts` (signInWithGoogle/signOut server actions), real landing page with working sign-in button.

- [5/16] `lib/slots.ts` + `lib/tz.ts`, tested in `tests/slots.test.ts` (10 tests: normal day, last-slot 16:15 boundary, partially/fully booked, time-off overlap, today-with-passed-times, past-date rejection, DST-shifting-zone UTC proof). Bumped `@types/node` to `^22` to match the installed Node 22 runtime and satisfy Vitest 5's peer dependency.

- [6/16] Physiotherapist chooser screen: `app/book/page.tsx` (server component, fetches active physiotherapists), `components/booking/PhysioCard.tsx`, `app/book/loading.tsx` skeleton, empty/error states. Responsive 1/2/3-column grid.

- [7/16] Date and slot picker: `GET /api/availability` (service-role read — RLS would otherwise hide other patients' bookings from the availability calculation), `components/booking/{DayStrip,SlotGrid,SummaryBar,SlotPicker}.tsx`, `app/book/[physioId]/page.tsx`. Day-strip pattern per DESIGN.md (not the spec's literal "month view" — DESIGN.md wins on UI shape).

- [8/16] Booking creation + confirmation: `lib/validation.ts` (+ `tests/validation.test.ts`, 14 tests) tested first, `POST /api/appointments` (re-validates past/grid/availability server-side, catches the Postgres exclusion-violation race as a 409), `/book/[physioId]/confirm` + `ConfirmForm`, `/book/success`. `lib/reference.ts` derives a display reference from the appointment id (no `reference` column in the spec's schema).

- [9/16] SMTP notifications: `lib/notify.ts` sends separate patient and reception messages via Gmail SMTP, retries each recipient once, reports per-recipient results and never rolls back a successful booking. The doctor is not an email recipient.

- [10/16] Google Calendar: `lib/google-calendar.ts` (createEvent/updateEvent/deleteEvent, token refresh, revoked-grant cleanup), wired into `POST /api/appointments` — stores `google_event_id` on success, silently skips (never fails the booking) if the patient declined the scope or the API call fails.

- [11/16] `/appointments`: `GET /api/appointments/me` (upcoming/past split), `PATCH`/`DELETE /api/appointments/[id]` (reschedule re-validates everything POST does, excluding the appointment's own current slot from the overlap check; cancel is soft, deletes the calendar event, notifies both parties). UI: `AppointmentsTabs`, `AppointmentCard`, `RescheduleDialog` (reuses `DayStrip`/`SlotGrid`), `CancelDialog` (shadcn `Dialog`, added via `npx shadcn add dialog`), `StatusBadge`.

- [12/16] Admin dashboard + appointments table: `lib/auth.ts` (`requireAdmin()` — proxy.ts's matcher doesn't cover `/api/admin/*`, so each admin API route re-checks the role itself), `/admin` stat tiles (today, this week, cancellations this month, per-physio load this week), `GET /api/admin/appointments` (paginated, no filters yet), `/admin/appointments` table with mobile card collapse. Read-only — edit/cancel/export land in step 13.

- [13/16] Admin edit, filters, Excel export: `PATCH /api/appointments/[id]` now branches on admin role (status/notes-only edits vs. full time/physio reschedule, sharing the same re-validation path); `lib/admin-appointments.ts` + `lib/excel.ts` shared between `GET /api/admin/appointments` (filters: date range, physio, status, free-text on patient name/email via `.or(..., {foreignTable})`; sortable; paginated) and `GET /api/admin/export` (same filters, no pagination, streams `.xlsx` — bold frozen header, auto-width, `appointments_<from>_to_<to>.xlsx`). Added `GET /api/physiotherapists` (spec route existed on paper, not yet built). UI: `Filters`, `ExportButton`, `EditDialog` (status + notes), inline Reschedule/Mark completed/Mark no-show/Cancel reusing existing dialogs. Fixed a real bug along the way: patient notification email was sourced from the caller's own session, which broke once admins could act on a patient's behalf.

- [14/16] Admin physio/availability/audit: `supabase/migrations/0002_storage.sql` (public `physio-photos` bucket, admin-write RLS); `/admin/physiotherapists` (add/edit/deactivate — never hard-delete, photo upload straight to Supabase Storage from the browser); `/admin/availability` (weekly rules editor + time-off add/remove, per physio); `/admin/audit` (read-only paginated feed). New admin API routes: physiotherapists CRUD, availability PUT (delete+reinsert), time-off POST/DELETE, audit GET.

- [15/16] Responsive and accessibility pass: automatic dark mode (pre-hydration script sets `.dark` from `prefers-color-scheme`, since nothing was toggling the class before); global `:focus-visible` outline in `app/globals.css` so every interactive element gets DESIGN.md's 2px azure ring, not just the ones I remembered to style individually; loading skeletons added for `/book/[physioId]` and `/appointments`; distinct error states (vs. silently falling back to "empty") in the admin appointments table; dropped `backdrop-blur` from the shadcn dialog scrim; fixed a real AA contrast failure in DESIGN.md's own `state.warn` hex plus a few small `text-azure` UI links that were under 4.5:1 on light grounds. Ran DESIGN.md's self-audit checklist (banned colours, shadow/blur, `rounded-full` misuse) across the whole codebase — clean otherwise.

- [16/16] `README.md` (local setup, Supabase project creation, Google OAuth client setup with exact redirect URIs/scopes, Gmail SMTP, promoting a user to admin, migrations/seed, tests, Vercel deploy) and `.env.example`. All 16 build-order steps complete — see `DECISIONS.md` for every judgement call, `docs/BACKLOG.md` for deferred nice-to-haves.

## In flight
- Earlier user-requested follow-up remains: audit/remove mock data and implement rating-request notifications for completed/cancelled appointments. Not part of this admin appointment chunk.

## Admin Clinic Settings visual pass (2026-09-26)
- Added the active Clinic Settings route with accessible tabs, persisted General clinic information, timezone/date-format controls, logo upload, live clinic preview, Clinic ID copy, loading/error/success states, and safe read-only views for unsupported booking/notification/integration/branding configuration.
- Added the RLS-protected singleton clinic settings migration and admin API plus a dedicated public branding storage bucket.
- Preserved the canonical sidebar with “Clinic Settings” active and “Home” unchanged.
- `npm.cmd test` passes 31 tests. Scoped lint passes with two non-blocking image warnings. `npm.cmd run build` passes.

## Admin Audit Log visual pass (2026-09-26)
- Replaced the basic audit list with a reference-style admin Audit Log page: real metrics, date/user/action/search filters, server-side pagination, immutable details drawer, loading/empty/error states, and filtered Excel export.
- Preserved the administrator-only audit route and existing appointment audit source; unsupported modules, IP addresses, security events, and record types are shown as unavailable or zero rather than invented.
- Preserved the canonical sidebar with “Audit Log” active and “Home” unchanged.
- `npm.cmd test` passes 31 tests. Scoped lint passes. `npm.cmd run build` passes.

## Admin Patients visual pass (2026-09-26)
- Added the active Patients admin route with server-side search/pagination, real profile and appointment aggregates, clinic-month metrics, selected-row details, overview/appointments tabs, loading/empty/error states, and filtered Excel export.
- Preserved the canonical sidebar and enabled only the existing Patients route.
- Unsupported patient status, notes, demographic, type, and edit workflows remain omitted because the current schema does not define them.
- `npm.cmd test` passes 31 tests. Production build passes. Scoped lint has no errors and one non-blocking profile-image warning.

## Admin Time Off visual pass (2026-09-26)
- Added the active Time Off admin route with real metrics, shared physiotherapist/date filters, paginated time-off list, clinic-timezone month calendar, event selection, reset, loading, empty, error, and delete confirmation states.
- Reused the existing admin time-off POST/DELETE workflow and added an authorized GET query for the page.
- Preserved the canonical sidebar and enabled only the existing Time Off route; unsupported type/status/approval fields remain omitted because they are not present in the schema.
- `npm.cmd test` passes 31 tests. Scoped lint passes with one non-blocking profile-image warning. `npm.cmd run build` passes.

## Admin Reports visual pass (2026-09-26)
- Added an admin-protected Reports route and aggregation endpoint using the shared appointment filters and clinic timezone.
- Added filtered metrics, daily summary, paginated detail table, status distribution, appointment trend, reset, timezone display, and filtered Excel export.
- Enabled the existing canonical Reports sidebar route without changing navigation labels or order.
- `npm.cmd test` passes 31 tests. Scoped lint passes. `npm.cmd run build` passes.

## Admin Availability visual pass (2026-09-26)
- Replaced the plain availability editor with a reference-style Availability page: clinic timezone header, active physiotherapist selector, accessible inner tabs, recurring weekly schedule table, slot duration guidance, and save states.
- Added a responsive Add Time Off off-canvas form using the existing secure time-off endpoint and clinic timezone conversions; time-off records render with clinic-local timestamps and safe removal confirmation.
- Sidebar/navigation was not changed.
- `npm.cmd test` passes 31 tests. `npm.cmd run build` passes. Scoped lint passes with one non-blocking profile-image warning.

## Admin Physiotherapists visual pass (2026-09-26)
- Replaced the flat physiotherapist list with a real-data management workspace: supported summary metrics, case-insensitive search, active/inactive and specialisation filters, pagination, keyboard-selectable rows, and responsive details panel.
- Added Overview, Availability, and Time Off tabs using existing admin data and workflows; retained the existing Add/Edit dialog, photo upload, and secure activate/deactivate mutation.
- Sidebar/navigation was not changed.
- `npm.cmd test` passes 31 tests. `npm.cmd run build` passes. Scoped lint passes with one non-blocking `next/no-img-element` warning.

## Admin Appointments visual pass (2026-09-26)
- Replaced the calendar/table switch with a filtered, paginated appointment workspace using real admin API data.
- Added clinic-time date and time-of-day filters, physiotherapist/status filters, real status counts, keyboard row selection, responsive details panel, public-reference copying, loading/empty/error states, and existing secure appointment actions.
- Centralized the canonical admin navigation in `components/admin/AdminNav.tsx`; unsupported destinations remain visibly listed but are not dead links.
- `npm.cmd run build` passes. Scoped lint passes with one non-blocking `next/no-img-element` warning.

## Live verification run (2026-09-24)
- `npm test`: 24/24 pass. `npm run build`: clean.
- Started the dev server and hit it directly: landing page renders ("Sign in with Google", "Need physio" both present); `/book`, `/appointments`, `/admin` all 307-redirect to `/` when signed out (proxy.ts working); `/api/appointments/me`, `/api/admin/appointments`, `/api/physiotherapists`, `POST /api/appointments` all return 401 without a session (route-level auth checks working independent of the page-level redirect).
- Confirmed via a direct REST call that **the migration has not been pushed to the live Supabase project yet** — `public.physiotherapists` doesn't exist there (`PGRST205`). This is the same item already listed under "Blocked / needs you" below; it means no real end-to-end flow (sign-in → booking → calendar/email) can be exercised until you run `supabase db push`.
- **Update:** the Chromium download had actually been running in the background the whole time (~707MB, just slow on this network) and completed after the above was written. Re-ran with a real headless browser: landing page renders correctly (Plus Jakarta Sans, azure pill button, no console errors), all three protected routes visually confirmed redirecting to `/` when signed out, and no horizontal scroll at a 360px viewport. Screenshot review caught one real gap: the hero heading was hardcoded to DESIGN.md's *mobile* size (44px) at every breakpoint, never scaling to the *desktop* size (60px) the same table specifies — fixed with a `lg:` variant in `app/page.tsx`. `playwright` stays as a devDependency for future real browser testing.

## Live verification run (2026-09-25)
- `node .\node_modules\next\dist\bin\next build` passes after the admin dashboard duplicate-variable fix.
- The production build completes successfully for the full app route tree, including `/admin`, `/book`, `/appointments`, and all API routes.

## Blocked / needs you (can't be done from here)
- Applying the migration to the live Supabase project (`npx supabase link --project-ref peipcienooeqqhoprsnn` then `npx supabase db push`, or `npx supabase db reset` if Docker is running) needs your own `supabase login` (interactive access token) — see README section 5.
- `RECEPTION_EMAIL` is blank in `.env`. Notifications work for the patient copy; the reception copy is skipped (logged, not fatal) until you set it.
- Actually deploying to Vercel and registering the Google OAuth client needs your own accounts — README sections 3 and 8 walk through both exactly.
- Full end-to-end click-through (real Google sign-in, real calendar event, real email) needs the above set up first; `npm run build` and `npm test` have been the verification loop throughout since there's no live backend to hit yet.

## Decisions made this session
See `DECISIONS.md` at project root.

- Keep physiotherapist/time-slot browsing public, while requiring authentication for appointment history, booking confirmation, and all mutations; admin routes require the admin role.
- Use the existing 30-minute idle policy; only browser activity resets it, not Supabase token refreshes.

## Redesign track (2026-09-24, in flight)
- [1/4] Admin shell (light rounded container + pill nav) and weekly calendar view (`AdminCalendar`, Calendar/Table toggle) — done, build + 24 tests pass.
- [2/4] Admin spec gaps: sortable table columns UI, admin creates a booking, change physiotherapist in Edit.
- [3/4] Client split view: doctors list left, weekly availability calendar right, no page change.
- [4/4] Remaining spec gaps: calendar retry flag, calendar status on success screen, toast warnings, overlap tests.

- Email: Gmail SMTP is the only email transport. Local `.env` needs `SMTP_USER`, `SMTP_PASSWORD`, and `RECEPTION_EMAIL`; Vercel Production values are not inherited by localhost. Calendar failure on prod still undiagnosed (needs Vercel log line).

- Redesign: /book is now one split screen (BookingWorkspace: doctors left, profile + month calendar + 45-min slots + Book bar right; mobile = doctor strip on top). Times still come from lib/slots via /api/availability. Top bar kept for all screens (mockup sidebars ignored). Next: confirm slide-over, appointments, reschedule dialog, then admin screens.
