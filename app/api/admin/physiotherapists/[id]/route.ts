import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { physiotherapistUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = physiotherapistUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid physiotherapist details" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("physiotherapists")
    .update(parsed.data)
    .eq("id", id)
    .select("id, full_name, specialisation, bio, email, photo_url, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not update physiotherapist" }, { status: 500 });
  }

  return NextResponse.json({ physiotherapist: data });
}
