# Backlog

Things worth doing that were not asked for. Not building these unless asked.

- Remove unused `public/*.svg` files left over from create-next-app scaffold.
- Generate Supabase TypeScript types (`supabase gen types typescript`) once the project is linked, so embedded relation queries don't need manual `as unknown as` casts.
- Reschedule dialog's day strip doesn't mute non-working weekdays like the main booking picker does (relies on the per-date empty state instead).
- Admin "Edit" dialog covers status + notes only; reassigning an appointment to a different physiotherapist isn't in the UI yet (the PATCH API already supports it — `physioId` in the admin update schema). Reschedule (same physio, new time) reuses the patient-facing dialog.
