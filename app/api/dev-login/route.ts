import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// LOCAL TESTING ONLY. Signs in as a fixed test user (no Google) so automated
// browser checks can reach signed-in and admin screens. Hard-disabled unless
// DEV_LOGIN_ENABLED=1 is set AND NODE_ENV is not "production" — never set the
// flag on Vercel. Creates dev-admin@example.test / dev-patient@example.test.
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.DEV_LOGIN_ENABLED !== "1") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams, origin } = new URL(request.url);
  const role = searchParams.get("role") === "patient" ? "patient" : "admin";
  const requested = searchParams.get("next");
  const next = requested?.startsWith("/") && !requested.startsWith("//")
    ? requested
    : role === "admin"
      ? "/admin"
      : "/book";

  const email = `dev-${role}@example.test`;
  const admin = createAdminClient();

  // Ignore "already registered" — the user only needs to exist.
  await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: `Dev ${role}` },
  });

  await admin.from("profiles").update({ role }).eq("email", email);

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    return NextResponse.json({ error: "Could not create test session" }, { status: 500 });
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError) {
    return NextResponse.json({ error: "Could not verify test session" }, { status: 500 });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
