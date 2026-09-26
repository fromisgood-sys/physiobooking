import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { clinicSettingsSchema } from "@/lib/validation";
import { CLINIC_TZ } from "@/lib/tz";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const { data, error } = await auth.supabase.from("clinic_settings").select("id, clinic_id, clinic_name, phone, email, website, address, city, region, postal_code, about, timezone, time_format, date_format, logo_url").eq("id", true).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load clinic settings" }, { status: 500 });
  if (!data) {
    const { data: created, error: createError } = await auth.supabase.from("clinic_settings").insert({ id: true, timezone: CLINIC_TZ, updated_by: auth.user.id }).select("id, clinic_id, clinic_name, phone, email, website, address, city, region, postal_code, about, timezone, time_format, date_format, logo_url").single();
    if (createError) return NextResponse.json({ error: "Could not initialise clinic settings" }, { status: 500 });
    return NextResponse.json({ settings: created });
  }
  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const body = await request.json().catch(() => null);
  const parsed = clinicSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid clinic settings" }, { status: 400 });
  const { data, error } = await auth.supabase.from("clinic_settings").upsert({ id: true, ...parsed.data, updated_by: auth.user.id }).select("id, clinic_id, clinic_name, phone, email, website, address, city, region, postal_code, about, timezone, time_format, date_format, logo_url").single();
  if (error) return NextResponse.json({ error: "Could not save clinic settings" }, { status: 500 });
  return NextResponse.json({ settings: data });
}
