begin;

create or replace function public.create_admin_appointment(
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
    select 1
    from public.profiles as actor
    where actor.id = p_actor_id and actor.role = 'admin'
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.profiles as patient
    set phone = p_phone
    where patient.id = p_patient_id and patient.role = 'patient';
  if not found then
    raise exception 'patient not found' using errcode = 'P0002';
  end if;

  insert into public.appointments (
    patient_id,
    physiotherapist_id,
    starts_at,
    status,
    reason_for_visit,
    comments_for_physiotherapist,
    created_by
  ) values (
    p_patient_id,
    p_physiotherapist_id,
    p_starts_at,
    'confirmed',
    p_reason_for_visit,
    nullif(p_comments_for_physiotherapist, ''),
    p_actor_id
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

  return query
    select v_appointment.id, v_appointment.starts_at, v_appointment.ends_at;
end;
$$;

revoke all on function public.create_admin_appointment(uuid, uuid, uuid, timestamptz, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.create_admin_appointment(uuid, uuid, uuid, timestamptz, text, text, text, boolean)
  to service_role;

commit;
