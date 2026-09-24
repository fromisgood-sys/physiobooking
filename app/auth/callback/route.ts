import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/book";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const { provider_token, provider_refresh_token, user, expires_at } = data.session;

      // Store the Google OAuth tokens for later Calendar API calls. A missing
      // provider_token (patient declined the calendar scope) is not an error —
      // the booking flow just skips the calendar step for that user.
      if (provider_token) {
        const admin = createAdminClient();
        await admin.from("google_tokens").upsert({
          user_id: user.id,
          provider_token,
          provider_refresh_token: provider_refresh_token ?? null,
          expires_at: expires_at ? new Date(expires_at * 1000).toISOString() : null,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
