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
    .from("physiotherapists")
    .select("id, full_name, specialisation, bio, photo_url")
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    return NextResponse.json({ error: "Could not load physiotherapists" }, { status: 500 });
  }

  return NextResponse.json({ physiotherapists: data });
}
