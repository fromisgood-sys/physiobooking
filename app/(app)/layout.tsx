import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut, signInWithGoogle } from "@/app/actions/auth";
import { NavLinks } from "@/components/layout/NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/book" className="whitespace-nowrap text-[15px] font-bold tracking-[-0.01em] text-ink">
              Physio Booking
            </Link>
            <NavLinks />
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="hidden h-8 w-8 rounded-full border border-line object-cover sm:block"
                  />
                ) : (
                  name && (
                    <div
                      aria-hidden="true"
                      className="hidden h-8 w-8 items-center justify-center rounded-full bg-azure-soft sm:flex text-[13px] font-semibold text-azure-hover"
                    >
                      {initial}
                    </div>
                  )
                )}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="whitespace-nowrap text-[15px] font-medium text-ink-soft transition-colors duration-150 ease-out hover:text-ink"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <form action={signInWithGoogle}>
                <button
                  type="submit"
                  className="flex h-10 items-center justify-center rounded-btn border border-line-strong bg-paper px-4 text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-paper-tint"
                >
                  Sign in
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
