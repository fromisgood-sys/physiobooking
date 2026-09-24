import { notFound } from "next/navigation";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { CLINIC_TZ } from "@/lib/tz";

export default async function BookPhysioPage({
  params,
}: {
  params: Promise<{ physioId: string }>;
}) {
  const { physioId } = await params;
  const supabase = await createClient();

  const { data: physio } = await supabase
    .from("physiotherapists")
    .select("id, full_name, specialisation")
    .eq("id", physioId)
    .eq("is_active", true)
    .maybeSingle();

  if (!physio) notFound();

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("weekday")
    .eq("physiotherapist_id", physioId);

  const availableWeekdays = Array.from(new Set((rules ?? []).map((r) => r.weekday)));
  const todayLabel = format(toZonedTime(new Date(), CLINIC_TZ), "yyyy-MM-dd");

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        {physio.full_name}
      </h1>
      {physio.specialisation && (
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
          {physio.specialisation}
        </p>
      )}

      <SlotPicker
        physioId={physio.id}
        todayLabel={todayLabel}
        availableWeekdays={availableWeekdays}
      />
    </main>
  );
}
