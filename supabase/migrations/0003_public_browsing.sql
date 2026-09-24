-- Allows signed-out visitors to browse physiotherapists and their weekly
-- availability, so the booking flow can be explored before signing in.
-- Sign-in is still required to actually create a booking (POST
-- /api/appointments already requires a session; RLS on appointments itself
-- is unchanged — anon still cannot read/write appointments).

begin;

create policy physiotherapists_select_anon on public.physiotherapists
  for select to anon using (true);

create policy availability_rules_select_anon on public.availability_rules
  for select to anon using (true);

commit;
