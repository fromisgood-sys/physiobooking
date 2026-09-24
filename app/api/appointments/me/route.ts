import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, reason_for_visit, physiotherapists(id, full_name, specialisation)"
    )
    .eq("patient_id", user.id)
    .order("starts_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Could not load appointments" }, { status: 500 });
  }

  const now = new Date();
  const rows = data ?? [];
  const upcoming = rows.filter((a) => new Date(a.ends_at) > now);
  const past = rows.filter((a) => new Date(a.ends_at) <= now).reverse();

  return NextResponse.json({ upcoming, past });
}
