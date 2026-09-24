# Physio Booking

Book a 45-minute physiotherapy session, manage it afterwards, and run the clinic's admin side — built with Next.js, Supabase, Google Calendar, and Formspree. See `physio-booking-app-spec.md` for the full spec, `DESIGN.md` for the visual system, and `DECISIONS.md` for judgement calls made where either was silent.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind v4 · shadcn/ui · Supabase (Postgres, RLS, Auth) · Google Calendar API v3 · Formspree · `exceljs` · `date-fns` / `date-fns-tz` · Vercel

## 1. Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `.env` using the steps below before `npm run dev` will do anything useful — the app needs a Supabase project and a Google OAuth client to sign in.

## 2. Create the Supabase project

1. [supabase.com](https://supabase.com) → New project. Note the project URL and keys from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` — the project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon`/`publishable` key.
   - `SUPABASE_SERVICE_ROLE_KEY` — the `service_role`/`secret` key. **Never** expose this to the browser or commit it.
2. Enable the Google provider: **Authentication → Providers → Google** → toggle on. You'll paste the Google Client ID/Secret here once you have them (step 3).
3. Note the provider's callback URL shown on that same screen — `https://<project-ref>.supabase.co/auth/v1/callback`. You'll need it for Google Cloud Console next.

## 3. Google Cloud Console OAuth client

1. [console.cloud.google.com](https://console.cloud.google.com) → a project → **APIs & Services → Library** → enable the **Google Calendar API**.
2. **APIs & Services → OAuth consent screen** → add the scope `https://www.googleapis.com/auth/calendar.events` under Data Access. Calendar scopes are sensitive; for real users beyond your test list, Google requires app verification before going to Production.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Web application:
   - **Authorized JavaScript origins**: your `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`, and your production URL once deployed).
   - **Authorized redirect URIs**: the Supabase callback URL from step 2.3 above — exactly, including `/auth/v1/callback`.
4. Copy the generated Client ID and Secret into:
   - `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
   - Supabase dashboard's Google provider screen (step 2.2).

The app requests `openid email profile https://www.googleapis.com/auth/calendar.events` with `access_type=offline&prompt=consent` (see `app/actions/auth.ts`) so a refresh token is issued every sign-in. If a patient declines the calendar scope, booking still succeeds — the calendar step is just skipped (`lib/google-calendar.ts`).

## 4. Formspree

1. [formspree.io](https://formspree.io) → new form. Copy its endpoint (`https://formspree.io/f/xxxxxxxx`) into `FORMSPREE_ENDPOINT`.
2. Set `RECEPTION_EMAIL` to the clinic's reception inbox — every booking event sends a copy there in addition to the patient. All notification sending goes through `lib/notify.ts`, server-side only.

## 5. Migrations and seed data

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase ...` works without a global install) and a personal access token from `npx supabase login` — this is separate from anything in `.env` and shouldn't go in it.

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # applies supabase/migrations/*.sql
```

Then run `supabase/seed.sql` against the project (Supabase Studio's SQL Editor, or `psql` with the connection string from Project Settings → Database) to create the 4 seeded physiotherapists and their Mon–Fri availability.

For local iteration with Docker running, `npx supabase db reset` rebuilds a local database from migrations + seed in one step.

## 6. Promote a user to admin

Sign in once with the account you want as admin (via the app, so its `profiles` row exists — the `handle_new_user` trigger creates it automatically), then in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'receptionist@example.com';
```

`/admin` is gated both by `proxy.ts` (redirects non-admins to `/book`) and by RLS (`is_admin()`), per the spec's dual-gate requirement.

## 7. Running tests

```bash
npm test
```

Vitest, no external services needed — `lib/slots.ts` and `lib/validation.ts` are pure functions covering slot generation (normal/partial/fully-booked days, the 16:15 last-slot boundary, time-off overlap, today-with-passed-times, past-date rejection, and a DST-shifting-zone proof that UTC storage is sound) and the clinic-hours/lead-time/zod validation rules.

## 8. Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket, then [vercel.com/new](https://vercel.com/new) → import it.
2. Add every variable from `.env.example` in **Project Settings → Environment Variables**, with real values. Set `NEXT_PUBLIC_APP_URL` to the production URL Vercel gives you (or your custom domain).
3. Back in Google Cloud Console (step 3.3), add the production URL to **Authorized JavaScript origins**. The redirect URI stays the Supabase callback URL — it doesn't change between environments.
4. Deploy. `npm run build` (what Vercel runs) must pass — it's been kept green throughout this build; see `docs/PROGRESS.md` for the verification history.
5. Run the migration against the **production** Supabase project the same way as step 5, if it isn't the same project you developed against.

## Commands

```bash
npm run dev        # local dev
npm run build      # production build — must pass before any chunk is "done"
npm test            # vitest
npx supabase db push    # apply migrations
npx supabase db reset   # rebuild local db from migrations + seed (needs Docker)
```
