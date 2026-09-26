import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { BookingWorkspace } from "@/components/booking/BookingWorkspace";
import { CLINIC_TZ } from "@/lib/tz";

export default async function BookPage() {
  const supabase = await createClient();
  const [{ data: physiotherapists, error }, { data: rules }, { data: { user } }] = await Promise.all([
    supabase
      .from("physiotherapists")
      .select("id, full_name, specialisation, bio, photo_url")
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("availability_rules").select("physiotherapist_id, weekday"),
    supabase.auth.getUser(),
  ]);

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, avatar_url, phone")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const weekdaysByPhysio = new Map<string, number[]>();
  for (const rule of rules ?? []) {
    const list = weekdaysByPhysio.get(rule.physiotherapist_id) ?? [];
    if (!list.includes(rule.weekday)) list.push(rule.weekday);
    weekdaysByPhysio.set(rule.physiotherapist_id, list);
  }

  const todayLabel = format(toZonedTime(new Date(), CLINIC_TZ), "yyyy-MM-dd");

  return (
    <BookingWorkspace
      todayLabel={todayLabel}
      physios={(physiotherapists ?? []).map((p) => ({
        id: p.id,
        fullName: p.full_name,
        specialisation: p.specialisation,
        bio: p.bio,
        photoUrl: p.photo_url,
        availableWeekdays: weekdaysByPhysio.get(p.id) ?? [],
      }))}
      physiotherapistError={Boolean(error)}
      profileName={profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? "Patient"}
      avatarUrl={profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null}
      phoneNumber={profile?.phone ?? ""}
    />
  );
}
