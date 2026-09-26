import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const searchSchema = z.string().trim().min(3).max(100);

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const parsed = searchSchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ patients: [] });

  const term = parsed.data;
  if (term.length < 3) return NextResponse.json({ patients: [] });

  const { data: withinLimit, error: limitError } = await auth.supabase.rpc("consume_admin_patient_search_limit");
  if (limitError) {
    const migrationMissing = limitError.code === "PGRST202" || limitError.code === "42883";
    const message = migrationMissing
      ? "Patient search needs a database migration. Ask an administrator to apply migration 0006, then retry."
      : "Patient search is temporarily unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if (!withinLimit) return NextResponse.json({ error: "Too many searches. Wait a minute and try again." }, { status: 429 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("search_admin_patients", {
    p_actor_id: auth.user.id,
    p_term: term,
  });

  if (error) return NextResponse.json({ error: "Could not search patients" }, { status: 500 });
  return NextResponse.json({ patients: data ?? [] });
}
