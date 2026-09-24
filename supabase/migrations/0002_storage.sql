-- Public bucket for physiotherapist portrait photos.

begin;

insert into storage.buckets (id, name, public)
values ('physio-photos', 'physio-photos', true)
on conflict (id) do nothing;

create policy physio_photos_public_read on storage.objects
  for select using (bucket_id = 'physio-photos');

create policy physio_photos_admin_write on storage.objects
  for insert with check (bucket_id = 'physio-photos' and public.is_admin());

create policy physio_photos_admin_update on storage.objects
  for update using (bucket_id = 'physio-photos' and public.is_admin());

create policy physio_photos_admin_delete on storage.objects
  for delete using (bucket_id = 'physio-photos' and public.is_admin());

commit;
