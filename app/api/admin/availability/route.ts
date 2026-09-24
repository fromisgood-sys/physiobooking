import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setAvailabilityRulesSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const physioId = searchParams.get("physioId");
  if (!physioId) {
    return NextResponse.json({ error: "physioId is required" }, { status: 400 });
  }

  const [{ data: rules, error: rulesError }, { data: timeOff, error: timeOffError }] =
    await Promise.all([
      auth.supabase
        .from("availability_rules")
        .select("id, weekday, start_time, end_time")
        .eq("physiotherapist_id", physioId)
        .order("weekday"),
      auth.supabase
        .from("time_off")
        .select("id, starts_at, ends_at, reason")
        .eq("physiotherapist_id", physioId)
        .order("starts_at"),
    ]);

  if (rulesError || timeOffError) {
    return NextResponse.json({ error: "Could not load availability" }, { status: 500 });
  }

  return NextResponse.json({ rules, timeOff });
}

/** Replaces every weekly rule for a physiotherapist in one go. */
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = setAvailabilityRulesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid availability rules" }, { status: 400 });
  }

  const { physioId, rules } = parsed.data;

  const { error: deleteError } = await auth.supabase
    .from("availability_rules")
    .delete()
    .eq("physiotherapist_id", physioId);

  if (deleteError) {
    return NextResponse.json({ error: "Could not update availability" }, { status: 500 });
  }

  if (rules.length > 0) {
    const { error: insertError } = await auth.supabase
      .from("availability_rules")
      .insert(rules.map((r) => ({ ...r, physiotherapist_id: physioId })));

    if (insertError) {
      return NextResponse.json({ error: "Could not update availability" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
