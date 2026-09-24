"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// `next` is optional and only meaningful when this action is bound with
// .bind(null, next) before being used as a form action (see the confirm
// page's sign-in prompt) — used unbound (<form action={signInWithGoogle}>,
// as the header/landing buttons do), Next.js calls this with a FormData as
// the first argument instead, hence the typeof guard below.
export async function signInWithGoogle(next?: string | FormData) {
  const supabase = await createClient();
  const callbackUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`);
  if (typeof next === "string" && next) callbackUrl.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      scopes: "openid email profile https://www.googleapis.com/auth/calendar.events",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    redirect("/?error=auth");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
