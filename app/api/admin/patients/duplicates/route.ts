import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminNewPatientDetailsSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const parsed = adminNewPatientDetailsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid patient details" }, { status: 400 });

  const { data: withinLimit, error: limitError } = await auth.supabase.rpc("consume_admin_patient_search_limit");
  if (limitError) {
    const migrationMissing = limitError.code === "PGRST202" || limitError.code === "42883";
    const message = migrationMissing
      ? "Patient lookup needs a database migration. Ask an administrator to apply migration 0006, then retry."
      : "Patient lookup is temporarily unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if (!withinLimit) return NextResponse.json({ error: "Too many lookups. Wait a minute and try again." }, { status: 429 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("find_admin_patient_duplicates", {
    p_actor_id: auth.user.id,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone,
  });
  if (error) return NextResponse.json({ error: "Could not check for an existing patient" }, { status: 500 });

  return NextResponse.json({ patients: data ?? [] });
}
