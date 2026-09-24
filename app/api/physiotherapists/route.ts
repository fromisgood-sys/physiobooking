import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Intentionally public — anyone can browse active physiotherapists before
// signing in (RLS now grants anon read on this table; see migration 0003).
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("physiotherapists")
    .select("id, full_name, specialisation, bio, photo_url")
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    return NextResponse.json({ error: "Could not load physiotherapists" }, { status: 500 });
  }

  return NextResponse.json({ physiotherapists: data });
}
