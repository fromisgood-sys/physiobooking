begin;

create table public.appointment_ratings (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  physiotherapist_id uuid not null references public.physiotherapists(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointment_ratings_physio_idx on public.appointment_ratings (physiotherapist_id, created_at);
create index appointment_ratings_patient_idx on public.appointment_ratings (patient_id, created_at);
alter table public.appointment_ratings enable row level security;
create policy ratings_patient_select on public.appointment_ratings for select using (patient_id = auth.uid() or public.is_admin());
create policy ratings_patient_insert on public.appointment_ratings for insert with check (patient_id = auth.uid());
create policy ratings_patient_update on public.appointment_ratings for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create trigger set_ratings_updated_at before update on public.appointment_ratings for each row execute procedure public.set_updated_at();

commit;
