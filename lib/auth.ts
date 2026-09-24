import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RequireAdminResult =
  | { ok: true; user: User; supabase: SupabaseServerClient }
  | { ok: false; status: 401 | 403 };

/**
 * Gate for /api/admin/* route handlers. proxy.ts only covers page paths
 * (matcher is /book, /appointments, /admin — not /api/admin), so API routes
 * re-check the admin role themselves rather than relying on the page-level
 * redirect.
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return { ok: false, status: 403 };

  return { ok: true, user, supabase };
}
