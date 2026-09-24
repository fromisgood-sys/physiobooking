# Physiotherapy Booking App — Build Specification

> **Instruction to Claude:** Build the complete, production-ready application described below. Do not scaffold placeholders or leave `TODO` comments in delivered code. Every file must be complete and runnable. Follow the stack, schema, and rules exactly. Where a decision is not specified, choose the simplest option that satisfies the acceptance criteria and state the decision in the README.

---

## 1. Product summary

A responsive web app that lets patients book 45-minute physiotherapy sessions with a chosen physiotherapist, manage those bookings, and receive email confirmations and Google Calendar entries. A receptionist logs in as an admin to see, edit, and export all appointments across all physiotherapists.

Three roles:

| Role | Access |
|---|---|
| **Patient** | Signs in with Google. Books, reschedules, cancels own appointments. Sees own history. |
| **Admin (receptionist)** |Books, Sees and manages every appointment. Manages physiotherapists and their availability. Exports to Excel. |
| **Physiotherapist** (optional, phase 2) | Read-only view of own schedule. Build the data model to support it; do not build the UI. |

---

## 2. Tech stack (non-negotiable)

- **Framework:** Next.js (App Router, TypeScript, React Server Components where sensible)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database & Auth:** Supabase (Postgres, Row Level Security, Supabase Auth with Google OAuth provider)
- **Calendar:** Google Calendar API v3, using the Google OAuth token obtained via Supabase Auth (request the `https://www.googleapis.com/auth/calendar.events` scope)
- **Email:** Formspree (HTTP POST to a Formspree form endpoint) — **do not configure SMTP or any mail server**
- **Excel export:** `exceljs` (server-side generation, streamed as an `.xlsx` download)
- **Date/time:** `date-fns` and `date-fns-tz`. Store all timestamps in UTC (`timestamptz`), render in the clinic timezone.
- **Validation:** `zod` on both client and server
- **Deployment target:** Vercel

---

## 3. Core booking rules (enforce on the server, not just the UI)

1. Every session is exactly **45 minutes**. Duration is not user-editable.
2. Bookable window is **08:00–17:00** clinic local time, Monday–Friday by default (configurable per physiotherapist).
3. The last bookable slot must **end** by 17:00 — so the final start time is **16:15**.
4. **Past dates and past times cannot be selected.** Disable them in the picker and reject them server-side.
5. No double-booking: a physiotherapist cannot have two appointments whose time ranges overlap. Enforce with a Postgres exclusion constraint, not only application logic.
6. Slots are generated from the selected physiotherapist's availability rules minus their existing appointments and any blocked time off.
7. A patient may not hold two appointments that overlap each other either.
8. Reschedules and cancellations follow all the same rules.
9. Set the clinic timezone in one place (`CLINIC_TZ`, default `Africa/Windhoek`) and use it everywhere.

---

## 4. Database schema (Supabase / Postgres)

Deliver this as a migration file in `supabase/migrations/`.

```sql
create extension if not exists btree_gist;

-- Mirrors auth.users, holds app-level role
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  role text not null default 'patient' check (role in ('patient','admin','physio')),
  created_at timestamptz not null default now()
);

create table public.physiotherapists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  specialisation text,
  bio text,
  photo_url text,
  email text not null,                -- physio's own notification address
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Recurring weekly availability
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  physiotherapist_id uuid not null references public.physiotherapists(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  check (start_time >= '08:00' and end_time <= '17:00' and start_time < end_time)
);

-- One-off blocked periods (leave, lunch, training)
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  physiotherapist_id uuid not null references public.physiotherapists(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  physiotherapist_id uuid not null references public.physiotherapists(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null generated always as (starts_at + interval '45 minutes') stored,
  slot tstzrange generated always as (tstzrange(starts_at, starts_at + interval '45 minutes', '[)')) stored,
  status text not null default 'confirmed'
    check (status in ('confirmed','rescheduled','cancelled','completed','no_show')),
  reason_for_visit text,
  notes text,                          -- admin-only field
  google_event_id text,                -- patient's calendar event id
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hard guarantee against double-booking (cancelled rows excluded)
alter table public.appointments
  add constraint no_overlap_per_physio
  exclude using gist (
    physiotherapist_id with =,
    slot with &&
  ) where (status <> 'cancelled');

alter table public.appointments
  add constraint no_overlap_per_patient
  exclude using gist (
    patient_id with =,
    slot with &&
  ) where (status <> 'cancelled');

-- Full audit trail of every change
create table public.appointment_audit (
  id bigserial primary key,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  changed_by uuid references public.profiles(id),
  action text not null,                -- created | rescheduled | cancelled | status_changed
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
```

**Also deliver:**
- A trigger that inserts a `profiles` row on `auth.users` insert.
- A trigger that maintains `updated_at`.
- A trigger that writes to `appointment_audit` on every insert/update of `appointments`.
- A `seed.sql` with 4 physiotherapists and Mon–Fri 08:00–17:00 availability rules for each.

### Row Level Security

Enable RLS on all tables. Policies:

- `profiles`: a user selects/updates only their own row; admins select all.
- `physiotherapists`, `availability_rules`: readable by any authenticated user; writable by admins only.
- `appointments`: a patient selects/inserts/updates only rows where `patient_id = auth.uid()`; admins do everything.
- Implement an `is_admin()` SQL helper function (`security definer`) that reads `profiles.role` and use it in the admin policies.
- The Excel export and any admin write path must run server-side with the service role key. **The service role key must never reach the browser.**

---

## 5. Authentication

- Supabase Auth, Google provider only. No email/password.
- Request scopes: `openid email profile https://www.googleapis.com/auth/calendar.events`, with `access_type=offline` and `prompt=consent` so a refresh token is issued.
- Store the Google `provider_token` and `provider_refresh_token` securely server-side (a `google_tokens` table restricted to service-role access) and refresh them when expired.
- Middleware protects `/book`, `/appointments`, and `/admin`. `/admin` additionally requires `role = 'admin'`.
- If a patient declines the calendar scope, the booking must still succeed — just skip the calendar step and tell them so.

---

## 6. Screens and flows

### Patient

**`/` — Landing.** Short value proposition, "Sign in with Google" button. Redirect signed-in users to `/book`.

**`/book` — Step 1: choose physiotherapist.** Card grid of active physiotherapists: photo, name, specialisation, short bio, "Select" button. Responsive: 1 column on mobile, 2 on tablet, 3+ on desktop.

**`/book/[physioId]` — Step 2: choose date and time.**
- Calendar month view. Past dates and days with no availability are disabled and visually muted.
- On selecting a date, fetch that physiotherapist's free 45-minute slots for that date from the server and render them as a responsive grid of time buttons (08:00, 08:45, 09:30 … 16:15), minus booked and blocked slots.
- Today's already-passed times are disabled.
- Show a loading skeleton while slots fetch; show a clear empty state ("No slots available on this date") when there are none.

**Step 3: confirm.** Summary card (physio, date, time, 45 min duration), plus fields for phone number and reason for visit. "Confirm booking" button with a disabled/spinner state to prevent double submission.

**Success screen.** Confirmation with a reference number, "Add to Google Calendar" status, and links to `/appointments`.

**`/appointments` — My appointments.**
- Two tabs: **Upcoming** and **Past**.
- Each card shows physio, date, time, status badge, and actions: **Reschedule** and **Cancel** (upcoming only).
- Reschedule reopens the slot picker for the same physiotherapist, pre-filtered to valid slots, and on save updates the DB row, patches the Google Calendar event, and fires update emails.
- Cancel asks for confirmation, sets status to `cancelled`, deletes the calendar event, and emails both parties.
- Past appointments are read-only history and must never be deleted from the database.

### Admin (`/admin`)

**Dashboard.** Stat tiles: appointments today, this week, cancellations this month, per-physiotherapist load.

**`/admin/appointments` — the main screen.**
- Table of **all** appointments with columns: patient name, patient email, phone, physiotherapist, date, start time, end time, status, reason, notes, created at.
- Filters: date range, physiotherapist, status, free-text search on patient name/email.
- Sortable columns, server-side pagination.
- Inline row actions: **Edit** (change date/time, change physiotherapist, change status, edit notes), **Cancel**, **Mark completed**, **Mark no-show**.
- Every edit must re-validate all booking rules, update the Google Calendar event, and send notification emails to the patient, the physiotherapist, and the reception inbox.
- **Export to Excel** button: exports the currently filtered result set as `.xlsx` via `exceljs` — bold header row, frozen top row, auto-width columns, dates formatted as `yyyy-mm-dd` and times as `HH:mm`, filename `appointments_<from>_to_<to>.xlsx`.
- On mobile the table collapses into stacked cards.

**`/admin/physiotherapists`.** CRUD for physiotherapists: add, edit, deactivate (never hard-delete if appointments exist), upload photo to Supabase Storage.

**`/admin/availability`.** Per physiotherapist: edit weekly availability rules and add/remove time-off blocks.

**`/admin/audit`.** Read-only feed of `appointment_audit` — who changed what and when.

---

## 7. Server actions / API routes

Implement each as a Next.js route handler or server action with zod validation, auth check, and role check.

| Route | Purpose |
|---|---|
| `GET /api/physiotherapists` | Active physiotherapists |
| `GET /api/availability?physioId=&date=` | Free 45-min slots for that physio on that date |
| `POST /api/appointments` | Create booking → validate → insert → create calendar event → send emails |
| `PATCH /api/appointments/[id]` | Reschedule or update → validate → update → patch calendar event → send emails |
| `DELETE /api/appointments/[id]` | Cancel (soft) → status `cancelled` → delete calendar event → send emails |
| `GET /api/appointments/me` | Current user's appointments, split upcoming/past |
| `GET /api/admin/appointments` | Admin list with filters, sort, pagination |
| `GET /api/admin/export` | Streams the filtered `.xlsx` |

**Slot generation algorithm** (`lib/slots.ts`, unit-tested):
1. Take the physio's `availability_rules` for that weekday.
2. Generate candidate starts every 45 minutes from `start_time`, keeping only those where `start + 45min <= end_time` and `<= 17:00`.
3. Drop any candidate overlapping a non-cancelled appointment or a `time_off` block.
4. If the date is today, drop candidates earlier than now (plus a 60-minute lead-time buffer, configurable).
5. Return as UTC ISO strings with clinic-local display labels.

---

## 8. Email notifications (Formspree)

Use a single server-side helper `lib/notify.ts` that POSTs JSON to `FORMSPREE_ENDPOINT`. Never call Formspree from the browser.

Send on: **booking created**, **rescheduled**, **cancelled**, **admin edit**.

Each send fires **two** payloads:
1. To the patient's email.
2. To the reception inbox (`RECEPTION_EMAIL`), cc-style, including the assigned physiotherapist's email in the body.

Payload shape:

```json
{
  "_subject": "Appointment confirmed — Tue 14 Oct, 09:30 with Dr. Kandjii",
  "recipient": "patient@example.com",
  "event": "booking_created",
  "reference": "APT-8F3K2",
  "patient_name": "...",
  "patient_email": "...",
  "patient_phone": "...",
  "physiotherapist": "...",
  "physiotherapist_email": "...",
  "date": "2026-10-14",
  "start_time": "09:30",
  "end_time": "10:15",
  "reason_for_visit": "...",
  "status": "confirmed",
  "message": "Plain-text body summarising the appointment and how to reschedule."
}
```

**Reliability rules:** email failures must never roll back a successful booking. Wrap notification calls in try/catch, log the failure, surface a non-blocking warning toast, and return success for the booking itself. Retry once with a short backoff.

---

## 9. Google Calendar integration

`lib/google-calendar.ts` with `createEvent`, `updateEvent`, `deleteEvent`.

- Create the event on the **patient's** primary calendar using their OAuth token; store the returned event id in `appointments.google_event_id`.
- Add the physiotherapist's email as an attendee so they get an invite.
- Event summary: `Physiotherapy — <Physio name>`. Description: reason for visit + reference number. Add a 24-hour and a 1-hour popup reminder.
- On reschedule, PATCH the existing event rather than creating a new one.
- On cancel, DELETE the event.
- Handle expired tokens by refreshing; handle a revoked grant by clearing the stored token and prompting the user to reconnect.
- Calendar failures, like email failures, must not fail the booking — store `google_event_id` as null and flag it for retry.

---

## 10. Responsive and accessibility requirements

- Mobile-first. Test at 360px, 768px, 1024px, 1440px.
- Minimum 44×44px tap targets for all slot buttons and calendar days.
- Full keyboard navigation through the date picker and slot grid; visible focus rings.
- Correct ARIA labels on slot buttons (`aria-label="09:30 to 10:15, available"`), `aria-disabled` on unavailable slots.
- Colour contrast meets WCAG AA. Never convey availability by colour alone — pair it with text or an icon.
- Light and dark mode.
- Loading skeletons, empty states, and error states for every data-fetching view.

---

## 11. Environment variables

Deliver a `.env.example` containing exactly these keys with placeholder values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
Callback URL (for OAuth)
FORMSPREE_ENDPOINT=
RECEPTION_EMAIL=
NEXT_PUBLIC_CLINIC_TZ=Africa/Windhoek
NEXT_PUBLIC_APP_URL=
BOOKING_LEAD_TIME_MINUTES=60
```

---

## 12. Project structure

```
app/
  (public)/page.tsx
  auth/callback/route.ts
  book/page.tsx
  book/[physioId]/page.tsx
  appointments/page.tsx
  admin/page.tsx
  admin/appointments/page.tsx
  admin/physiotherapists/page.tsx
  admin/availability/page.tsx
  admin/audit/page.tsx
  api/...  (routes from §7)
components/
  booking/PhysioCard.tsx, DatePicker.tsx, SlotGrid.tsx, ConfirmCard.tsx
  appointments/AppointmentCard.tsx, RescheduleDialog.tsx, CancelDialog.tsx
  admin/AppointmentsTable.tsx, Filters.tsx, ExportButton.tsx, EditDialog.tsx
  ui/  (shadcn)
lib/
  supabase/client.ts, server.ts, admin.ts
  slots.ts, notify.ts, google-calendar.ts, excel.ts, validation.ts, tz.ts
supabase/
  migrations/0001_init.sql
  seed.sql
tests/
  slots.test.ts, validation.test.ts, overlap.test.ts
```

---

## 13. Tests

Write unit tests with Vitest for:
- Slot generation: normal day, partially booked day, fully booked day, today with passed times, time-off overlap, last-slot-is-16:15 boundary.
- Rejection of past dates, out-of-hours times, and non-45-minute durations.
- Overlap detection for both physiotherapist and patient.
- Timezone correctness across a DST-shifting zone to prove UTC storage is sound.

---

## 14. Deliverables

1. Complete, runnable source code for every file listed above.
2. `supabase/migrations/0001_init.sql` including tables, constraints, triggers, RLS policies, and helper functions.
3. `supabase/seed.sql`.
4. `.env.example`.
5. `README.md` covering: local setup, Supabase project creation, enabling the Google provider, Google Cloud Console OAuth client setup with the exact redirect URIs and scopes, creating the Formspree form, promoting a user to admin, running migrations and seeds, running tests, and deploying to Vercel.
6. A short `DECISIONS.md` listing any judgement calls made where this spec was silent.

---

## 15. Acceptance criteria

The build is complete only when all of the following are true:

- [ ] A user can sign in with Google and land on the physiotherapist chooser.
- [ ] Selecting a physiotherapist and a date shows only genuinely free 45-minute slots between 08:00 and 16:15.
- [ ] Past dates and past times cannot be selected, and are rejected if posted directly to the API.
- [ ] Two concurrent bookings for the same slot result in exactly one success and one clear "slot no longer available" error.
- [ ] Booking sends emails to the patient and the reception inbox via Formspree, and creates a Google Calendar event on the patient's calendar with the physiotherapist as attendee.
- [ ] A patient can reschedule and cancel, with the calendar event and both emails updated accordingly.
- [ ] `/appointments` shows the patient's full history, past appointments included.
- [ ] An admin sees every appointment with its assigned physiotherapist, can filter and edit, and edits propagate to calendar and email.
- [ ] The admin export downloads a valid `.xlsx` matching the active filters.
- [ ] A non-admin who navigates to `/admin` is blocked both by middleware and by RLS.
- [ ] The whole app is usable on a 360px-wide screen.
- [ ] All tests pass.
