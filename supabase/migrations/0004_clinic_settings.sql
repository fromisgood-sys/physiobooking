begin;

create table public.clinic_settings (
  id boolean primary key default true check (id),
  clinic_id text not null unique default ('PC-CLINIC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  clinic_name text not null default 'PhysioCare Clinic',
  phone text not null default '',
  email text not null default '',
  website text,
  address text not null default '',
  city text not null default '',
  region text,
  postal_code text,
  about text not null default '',
  timezone text not null default 'Africa/Windhoek',
  time_format text not null default '24h' check (time_format in ('12h', '24h')),
  date_format text not null default 'dd MMM yyyy' check (date_format in ('dd MMM yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd')),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.clinic_settings enable row level security;
create policy clinic_settings_admin_select on public.clinic_settings for select using (public.is_admin());
create policy clinic_settings_admin_insert on public.clinic_settings for insert with check (public.is_admin());
create policy clinic_settings_admin_update on public.clinic_settings for update using (public.is_admin()) with check (public.is_admin());
create trigger set_clinic_settings_updated_at before update on public.clinic_settings for each row execute procedure public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('clinic-branding', 'clinic-branding', true)
on conflict (id) do nothing;
create policy clinic_branding_public_read on storage.objects for select using (bucket_id = 'clinic-branding');
create policy clinic_branding_admin_write on storage.objects for insert with check (bucket_id = 'clinic-branding' and public.is_admin());
create policy clinic_branding_admin_update on storage.objects for update using (bucket_id = 'clinic-branding' and public.is_admin());
create policy clinic_branding_admin_delete on storage.objects for delete using (bucket_id = 'clinic-branding' and public.is_admin());

commit;
