begin;

alter table public.appointments
  add column comments_for_physiotherapist text,
  add constraint appointments_physio_comments_length
    check (comments_for_physiotherapist is null or char_length(comments_for_physiotherapist) <= 500);

create table public.admin_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  module text not null check (module = 'Patient'),
  record_id uuid not null,
  reference text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
create index admin_audit_events_created_idx on public.admin_audit_events (created_at desc);
alter table public.admin_audit_events enable row level security;
create policy admin_audit_events_select_admin on public.admin_audit_events
  for select using (public.is_admin());

create table public.admin_patient_search_limits (
  admin_id uuid not null references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  request_count smallint not null default 0,
  primary key (admin_id, window_start)
);
alter table public.admin_patient_search_limits enable row level security;

create function public.consume_admin_patient_search_limit()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := to_timestamp(floor(extract(epoch from now()) / 60) * 60);
  v_count smallint;
begin
  if not public.is_admin() then
    return false;
  end if;

  insert into public.admin_patient_search_limits (admin_id, window_start, request_count)
  values (auth.uid(), v_window_start, 1)
  on conflict (admin_id, window_start) do update
    set request_count = public.admin_patient_search_limits.request_count + 1
    where public.admin_patient_search_limits.request_count < 30
  returning request_count into v_count;

  if v_count = 1 then
    delete from public.admin_patient_search_limits
    where window_start < now() - interval '1 day';
  end if;

  return v_count is not null;
end;
$$;
revoke all on function public.consume_admin_patient_search_limit() from public, anon;
grant execute on function public.consume_admin_patient_search_limit() to authenticated;

create or replace function public.audit_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_audit (appointment_id, changed_by, action, old_values, new_values)
    values (
      new.id,
      coalesce(auth.uid(), new.created_by),
      'created',
      null,
      to_jsonb(new) - 'reason_for_visit' - 'notes' - 'comments_for_physiotherapist'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      v_action := 'cancelled';
    elsif new.starts_at <> old.starts_at or new.physiotherapist_id <> old.physiotherapist_id then
      v_action := 'rescheduled';
    else
      v_action := 'status_changed';
    end if;
    insert into public.appointment_audit (appointment_id, changed_by, action, old_values, new_values)
    values (
      new.id,
      auth.uid(),
      v_action,
      to_jsonb(old) - 'reason_for_visit' - 'notes' - 'comments_for_physiotherapist',
      to_jsonb(new) - 'reason_for_visit' - 'notes' - 'comments_for_physiotherapist'
    );
    return new;
  end if;
  return new;
end;
$$;

create function public.find_admin_patient_duplicates(
  p_actor_id uuid,
  p_email text,
  p_phone text
)
returns table (id uuid, full_name text, email text, phone text, avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where profiles.id = p_actor_id and profiles.role = 'admin'
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  with entered as (
    select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as digits
  )
  select profile.id, profile.full_name, profile.email, profile.phone, profile.avatar_url
  from public.profiles as profile
  cross join entered
  where profile.role = 'patient'
    and (
      lower(profile.email) = lower(p_email)
      or (
        entered.digits <> ''
        and case
          when regexp_replace(coalesce(profile.phone, ''), '\D', '', 'g') like '264%'
            then '+' || regexp_replace(profile.phone, '\D', '', 'g')
          when regexp_replace(coalesce(profile.phone, ''), '\D', '', 'g') like '0%'
            then '+264' || substr(regexp_replace(profile.phone, '\D', '', 'g'), 2)
          else '+' || regexp_replace(coalesce(profile.phone, ''), '\D', '', 'g')
        end = case
          when entered.digits like '264%' then '+' || entered.digits
          when entered.digits like '0%' then '+264' || substr(entered.digits, 2)
          else '+' || entered.digits
        end
      )
    )
  order by (lower(profile.email) = lower(p_email)) desc, profile.id
  limit 3;
end;
$$;
revoke all on function public.find_admin_patient_duplicates(uuid, text, text) from public, anon, authenticated;
grant execute on function public.find_admin_patient_duplicates(uuid, text, text) to service_role;

create function public.search_admin_patients(
  p_actor_id uuid,
  p_term text
)
returns table (id uuid, full_name text, email text, phone text, avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term text;
begin
  if not exists (
    select 1 from public.profiles where profiles.id = p_actor_id and profiles.role = 'admin'
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_term := replace(replace(replace(p_term, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');

  return query
  select profile.id, profile.full_name, profile.email, profile.phone, profile.avatar_url
  from public.profiles as profile
  where profile.role = 'patient'
    and (
      profile.full_name ilike '%' || v_term || '%' escape E'\\'
      or profile.email ilike '%' || v_term || '%' escape E'\\'
      or profile.phone ilike '%' || v_term || '%' escape E'\\'
      or (
        regexp_replace(p_term, '\D', '', 'g') <> ''
        and regexp_replace(coalesce(profile.phone, ''), '\D', '', 'g')
          like '%' || regexp_replace(p_term, '\D', '', 'g') || '%'
      )
    )
  order by profile.full_name, profile.id
  limit 6;
end;
$$;
revoke all on function public.search_admin_patients(uuid, text) from public, anon, authenticated;
grant execute on function public.search_admin_patients(uuid, text) to service_role;

create function public.create_admin_appointment(
  p_actor_id uuid,
  p_patient_id uuid,
  p_physiotherapist_id uuid,
  p_starts_at timestamptz,
  p_phone text,
  p_reason_for_visit text,
  p_comments_for_physiotherapist text,
  p_patient_created boolean default false
)
returns table (id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
begin
  if not exists (
    select 1 from public.profiles where id = p_actor_id and role = 'admin'
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.profiles
    set phone = p_phone
    where profiles.id = p_patient_id and profiles.role = 'patient';
  if not found then
    raise exception 'patient not found' using errcode = 'P0002';
  end if;

  insert into public.appointments (
    patient_id, physiotherapist_id, starts_at, status, reason_for_visit,
    comments_for_physiotherapist, created_by
  ) values (
    p_patient_id, p_physiotherapist_id, p_starts_at, 'confirmed',
    p_reason_for_visit, nullif(p_comments_for_physiotherapist, ''), p_actor_id
  ) returning * into v_appointment;

  if p_patient_created then
    insert into public.admin_audit_events (actor_id, action, module, record_id, reference, summary)
    values (
      p_actor_id,
      'created',
      'Patient',
      p_patient_id,
      'PAT-' || upper(substr(replace(p_patient_id::text, '-', ''), 1, 6)),
      'Patient profile created for an appointment'
    );
  end if;

  return query select v_appointment.id, v_appointment.starts_at, v_appointment.ends_at;
end;
$$;
revoke all on function public.create_admin_appointment(uuid, uuid, uuid, timestamptz, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_admin_appointment(uuid, uuid, uuid, timestamptz, text, text, text, boolean) to service_role;

create view public.admin_audit_feed with (security_invoker = true) as
  select
    'appointment:' || audit.id::text as id,
    audit.appointment_id as record_id,
    'APT-' || upper(substr(replace(audit.appointment_id::text, '-', ''), 1, 6)) as reference,
    'Appointment'::text as module,
    audit.action,
    coalesce(audit.new_values, audit.old_values) as details,
    case when audit.action = 'created' then 'Appointment created' else 'Appointment ' || replace(audit.action, '_', ' ') end as summary,
    audit.created_at,
    audit.changed_by as actor_id,
    actor.full_name as actor_name,
    actor.email as actor_email,
    actor.role as actor_role
  from public.appointment_audit as audit
  left join public.profiles as actor on actor.id = audit.changed_by
  union all
  select
    'admin:' || event.id::text as id,
    event.record_id,
    event.reference,
    event.module,
    event.action,
    null::jsonb as details,
    event.summary,
    event.created_at,
    event.actor_id,
    actor.full_name as actor_name,
    actor.email as actor_email,
    actor.role as actor_role
  from public.admin_audit_events as event
  left join public.profiles as actor on actor.id = event.actor_id;
grant select on public.admin_audit_feed to authenticated;

commit;
