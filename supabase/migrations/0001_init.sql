-- Physiotherapy booking app — initial schema
-- Tables, exclusion constraints, triggers, RLS.
--
-- Wrapped in an explicit transaction: Supabase's SQL Editor commits each
-- statement as it runs rather than treating a pasted script as one atomic
-- unit, so a mid-script error otherwise leaves the earlier statements
-- applied. begin/commit makes a failure roll back everything above it too.

begin;

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ============================================================
-- Tables
-- ============================================================

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
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Recurring weekly availability
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  physiotherapist_id uuid not null references public.physiotherapists(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
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
  -- Not GENERATED ALWAYS: timestamptz + interval is STABLE, not IMMUTABLE
  -- (it depends on the session's TimeZone), so Postgres rejects it in a
  -- generated column expression. Populated by compute_appointment_slot()
  -- below instead, which is functionally equivalent from the app's side —
  -- callers still never set these two columns themselves.
  ends_at timestamptz not null,
  slot tstzrange not null,
  status text not null default 'confirmed'
    check (status in ('confirmed','rescheduled','cancelled','completed','no_show')),
  reason_for_visit text,
  notes text,
  google_event_id text,
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
  action text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

-- Google OAuth tokens — service-role access only, never exposed via RLS policy
create table public.google_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider_token text,
  provider_refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Indexes supporting the queries the app actually runs
create index appointments_physio_starts_idx on public.appointments (physiotherapist_id, starts_at);
create index appointments_patient_idx on public.appointments (patient_id);
create index availability_rules_physio_weekday_idx on public.availability_rules (physiotherapist_id, weekday);
create index time_off_physio_idx on public.time_off (physiotherapist_id);
create index appointment_audit_appointment_idx on public.appointment_audit (appointment_id);

-- ============================================================
-- Helper functions
-- ============================================================

create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_appointments_updated_at
before update on public.appointments
for each row execute procedure public.set_updated_at();

-- Populates ends_at/slot from starts_at (see the column comments on
-- public.appointments for why this is a trigger and not a generated column).
create function public.compute_appointment_slot()
returns trigger
language plpgsql
as $$
begin
  new.ends_at := new.starts_at + interval '45 minutes';
  new.slot := tstzrange(new.starts_at, new.ends_at, '[)');
  return new;
end;
$$;

create trigger compute_appointments_slot
before insert or update of starts_at on public.appointments
for each row execute procedure public.compute_appointment_slot();

create trigger set_google_tokens_updated_at
before update on public.google_tokens
for each row execute procedure public.set_updated_at();

-- Inserts a profiles row whenever a new auth.users row is created
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Writes an audit row on every insert/update of appointments
create function public.audit_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if (tg_op = 'INSERT') then
    insert into public.appointment_audit (appointment_id, changed_by, action, old_values, new_values)
    values (new.id, coalesce(auth.uid(), new.created_by), 'created', null, to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      v_action := 'cancelled';
    elsif new.starts_at <> old.starts_at or new.physiotherapist_id <> old.physiotherapist_id then
      v_action := 'rescheduled';
    else
      v_action := 'status_changed';
    end if;
    insert into public.appointment_audit (appointment_id, changed_by, action, old_values, new_values)
    values (new.id, auth.uid(), v_action, to_jsonb(old), to_jsonb(new));
    return new;
  end if;
  return new;
end;
$$;

create trigger appointments_audit
after insert or update on public.appointments
for each row execute procedure public.audit_appointment_change();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.physiotherapists enable row level security;
alter table public.availability_rules enable row level security;
alter table public.time_off enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_audit enable row level security;
alter table public.google_tokens enable row level security;

-- profiles: a user sees/updates only their own row; admins see/update all
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update_own_or_admin on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- physiotherapists: readable by any authenticated user; writable by admins only
create policy physiotherapists_select_authenticated on public.physiotherapists
  for select to authenticated using (true);

create policy physiotherapists_write_admin on public.physiotherapists
  for all using (public.is_admin()) with check (public.is_admin());

-- availability_rules: readable by any authenticated user; writable by admins only
create policy availability_rules_select_authenticated on public.availability_rules
  for select to authenticated using (true);

create policy availability_rules_write_admin on public.availability_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- time_off: readable by any authenticated user (needed for slot generation); writable by admins only
create policy time_off_select_authenticated on public.time_off
  for select to authenticated using (true);

create policy time_off_write_admin on public.time_off
  for all using (public.is_admin()) with check (public.is_admin());

-- appointments: a patient sees/creates/updates only their own rows; admins do everything
create policy appointments_select_own_or_admin on public.appointments
  for select using (patient_id = auth.uid() or public.is_admin());

create policy appointments_insert_own_or_admin on public.appointments
  for insert with check (patient_id = auth.uid() or public.is_admin());

create policy appointments_update_own_or_admin on public.appointments
  for update using (patient_id = auth.uid() or public.is_admin())
  with check (patient_id = auth.uid() or public.is_admin());

-- appointment_audit: admin-only read-only feed
create policy appointment_audit_select_admin on public.appointment_audit
  for select using (public.is_admin());

-- google_tokens: no policies — service role only (service role bypasses RLS entirely)

commit;
