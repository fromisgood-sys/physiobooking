import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { physiotherapistSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("physiotherapists")
    .select("id, full_name, specialisation, bio, email, photo_url, is_active")
    .order("full_name");

  if (error) {
    return NextResponse.json({ error: "Could not load physiotherapists" }, { status: 500 });
  }

  return NextResponse.json({ physiotherapists: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = physiotherapistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid physiotherapist details" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("physiotherapists")
    .insert(parsed.data)
    .select("id, full_name, specialisation, bio, email, photo_url, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not create physiotherapist" }, { status: 500 });
  }

  return NextResponse.json({ physiotherapist: data });
}
