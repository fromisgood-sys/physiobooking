import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createTimeOffSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const physioId = searchParams.get("physioId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = auth.supabase
    .from("time_off")
    .select("id, physiotherapist_id, starts_at, ends_at, reason, physiotherapists(id, full_name, specialisation, photo_url)")
    .order("starts_at", { ascending: true });
  if (physioId) query = query.eq("physiotherapist_id", physioId);
  if (from) query = query.gte("ends_at", from);
  if (to) query = query.lte("starts_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load time off" }, { status: 500 });
  return NextResponse.json({ timeOff: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = createTimeOffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid time-off details" }, { status: 400 });
  }

  const { physioId, startsAt, endsAt, reason } = parsed.data;

  if (new Date(endsAt) <= new Date(startsAt)) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("time_off")
    .insert({
      physiotherapist_id: physioId,
      starts_at: startsAt,
      ends_at: endsAt,
      reason: reason ?? null,
    })
    .select("id, starts_at, ends_at, reason")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not add time off" }, { status: 500 });
  }

  return NextResponse.json({ timeOff: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("time_off").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Could not remove time off" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
