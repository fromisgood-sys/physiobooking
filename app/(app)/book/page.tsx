import { UserRoundX } from "lucide-react";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { BookingWorkspace } from "@/components/booking/BookingWorkspace";
import { CLINIC_TZ } from "@/lib/tz";

export default async function BookPage() {
  const supabase = await createClient();
  const [{ data: physiotherapists, error }, { data: rules }] = await Promise.all([
    supabase
      .from("physiotherapists")
      .select("id, full_name, specialisation, bio, photo_url")
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("availability_rules").select("physiotherapist_id, weekday"),
  ]);

  const weekdaysByPhysio = new Map<string, number[]>();
  for (const rule of rules ?? []) {
    const list = weekdaysByPhysio.get(rule.physiotherapist_id) ?? [];
    if (!list.includes(rule.weekday)) list.push(rule.weekday);
    weekdaysByPhysio.set(rule.physiotherapist_id, list);
  }

  const todayLabel = format(toZonedTime(new Date(), CLINIC_TZ), "yyyy-MM-dd");

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:py-10">
      {error && (
        <p className="text-[15px] text-state-danger">
          Couldn&rsquo;t load physiotherapists. Try refreshing the page.
        </p>
      )}

      {!error && physiotherapists?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-paper-tint px-6 py-16 text-center">
          <UserRoundX className="h-8 w-8 text-ink-muted" aria-hidden="true" />
          <p className="text-[15px] text-ink-soft">No physiotherapists are available right now.</p>
        </div>
      )}

      {!error && physiotherapists && physiotherapists.length > 0 && (
        <BookingWorkspace
          todayLabel={todayLabel}
          physios={physiotherapists.map((p) => ({
            id: p.id,
            fullName: p.full_name,
            specialisation: p.specialisation,
            bio: p.bio,
            photoUrl: p.photo_url,
            availableWeekdays: weekdaysByPhysio.get(p.id) ?? [],
          }))}
        />
      )}
    </main>
  );
}
