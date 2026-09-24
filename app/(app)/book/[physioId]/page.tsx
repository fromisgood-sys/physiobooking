import Link from "next/link";
import { notFound } from "next/navigation";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
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
    .select("id, full_name, specialisation, photo_url")
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
  const initials = (physio.full_name as string)
    .split(" ")
    .map((part: string) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <Link
        href="/book"
        className="flex w-fit items-center gap-1.5 text-[15px] font-medium text-ink-soft transition-colors duration-150 ease-out hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All physiotherapists
      </Link>

      <div className="mt-6 flex items-center gap-4">
        {physio.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={physio.photo_url}
            alt={physio.full_name}
            className="h-14 w-14 shrink-0 rounded-[16px] object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-azure-soft text-[16px] font-semibold text-azure-hover"
          >
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
            {physio.full_name}
          </h1>
          {physio.specialisation && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
              {physio.specialisation}
            </p>
          )}
        </div>
      </div>

      <SlotPicker
        physioId={physio.id}
        todayLabel={todayLabel}
        availableWeekdays={availableWeekdays}
      />
    </main>
  );
}
