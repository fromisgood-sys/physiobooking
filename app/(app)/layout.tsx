import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut, signInWithGoogle } from "@/app/actions/auth";

function LogoMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M8 29V6.5C8 5.7 8.7 5 9.5 5H17a8 8 0 0 1 0 16h-4"
        stroke="#4B7BF5"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="5" r="2.5" fill="#D6F24B" />
    </svg>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#edf3fb]">
      <header className="border-b border-[#dfe7f3] bg-[#edf3fb]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/book" className="flex items-center gap-2.5" aria-label="Physio Booking home">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#4B7BF5]">
              <LogoMark />
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[#0f172a] sm:text-[22px]">
              <span className="font-semibold text-[#4B7BF5]">Physio</span>Booking
            </span>
          </Link>

          {user ? (
            <details className="relative">
              <summary
                aria-label="Account menu"
                className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-btn px-1 marker:hidden [&::-webkit-details-marker]:hidden"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full border border-line object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-azure-soft text-[15px] font-semibold text-azure-hover"
                  >
                    {initial}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-ink-soft" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-12 z-20 w-56 rounded-card border border-line bg-paper p-2 shadow-[var(--shadow-float)]">
                <p className="truncate px-3 py-2 text-[13px] text-ink-muted">{name}</p>
                <Link
                  href="/book"
                  className="flex h-11 items-center rounded-btn px-3 text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-paper-tint"
                >
                  Book appointment
                </Link>
                <Link
                  href="/appointments"
                  className="flex h-11 items-center rounded-btn px-3 text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-paper-tint"
                >
                  My appointments
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center rounded-btn px-3 text-left text-[15px] font-medium text-ink-soft transition-colors duration-150 ease-out hover:bg-paper-tint"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </details>
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
      </header>

      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
