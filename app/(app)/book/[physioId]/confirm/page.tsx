import { notFound, redirect } from "next/navigation";
import { toZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { ConfirmForm } from "@/components/booking/ConfirmForm";
import { CLINIC_TZ, SESSION_MINUTES } from "@/lib/tz";

export default async function ConfirmBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ physioId: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const { physioId } = await params;
  const { start } = await searchParams;

  const startUtc = start ? new Date(start) : null;
  if (!startUtc || Number.isNaN(startUtc.getTime())) {
    redirect(`/book/${physioId}`);
  }

  const supabase = await createClient();
  const { data: physio } = await supabase
    .from("physiotherapists")
    .select("id, full_name")
    .eq("id", physioId)
    .eq("is_active", true)
    .maybeSingle();

  if (!physio) notFound();

  const local = toZonedTime(startUtc, CLINIC_TZ);
  const dateLabel = local.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeLabel = local.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        Confirm your booking
      </h1>

      <div className="mt-8 max-w-md rounded-card border border-line bg-paper-tint p-6">
        <p className="text-[18px] font-semibold leading-6 tracking-[-0.01em] text-ink">
          {physio.full_name}
        </p>
        <p className="mt-2 text-[15px] tabular-nums text-ink-soft">
          {dateLabel} &middot; {timeLabel} &middot; {SESSION_MINUTES} min
        </p>
      </div>

      <ConfirmForm physioId={physio.id} startUtc={startUtc.toISOString()} />
    </main>
  );
}
