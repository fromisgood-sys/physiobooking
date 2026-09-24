-- Seed data: 4 physiotherapists, Mon–Fri 08:00–17:00 availability each.
-- IDs are hand-picked but RFC 4122 v4-conformant (version nibble 4, variant
-- nibble 8) so they pass the same zod `.uuid()` validation real Supabase-
-- generated ids do.

insert into public.physiotherapists (id, full_name, specialisation, bio, email, is_active)
values
  ('11111111-1111-4111-8111-111111111111', 'Dr. Ester Kandjii', 'Sports rehabilitation',
   'Works with athletes and active patients recovering from injury, back on their feet with a plan that holds up outside the clinic.',
   'ekandjii@clinic.example', true),
  ('22222222-2222-4222-8222-222222222222', 'Dr. Johan Nel', 'Musculoskeletal & spinal',
   'Focused on chronic back and neck pain, using hands-on treatment paired with a home exercise programme.',
   'jnel@clinic.example', true),
  ('33333333-3333-4333-8333-333333333333', 'Dr. Ndapewa Shilongo', 'Post-surgical recovery',
   'Guides patients through rehab after joint replacement or surgery, pacing recovery around real-world movement.',
   'nshilongo@clinic.example', true),
  ('44444444-4444-4444-8444-444444444444', 'Dr. Robert Wilson', 'Neurological rehabilitation',
   'Treats patients recovering from stroke or nerve injury, rebuilding movement and confidence one session at a time.',
   'rwilson@clinic.example', true);

-- Mon(1)–Fri(5), 08:00–17:00, for each physiotherapist
insert into public.availability_rules (physiotherapist_id, weekday, start_time, end_time)
select p.id, weekday, '08:00', '17:00'
from public.physiotherapists p
cross join generate_series(1, 5) as weekday
where p.id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
);
