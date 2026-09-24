import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initial = (user?.email ?? "A").charAt(0).toUpperCase();

  return (
    <div className="flex flex-1 flex-col bg-paper-sunk px-3 py-3 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-block bg-paper px-5 py-3">
          <Link href="/admin" className="flex items-center gap-2 text-[17px] font-bold tracking-[-0.01em] text-ink">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-btn bg-azure text-[15px] text-white">
              P
            </span>
            Physio Booking
          </Link>
          <AdminNav />
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full border border-line object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-azure-soft text-[14px] font-semibold text-azure-hover">
                {initial}
              </span>
            )}
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-tint text-ink-soft transition-colors duration-150 ease-out hover:bg-azure-soft hover:text-ink"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden rounded-block bg-paper">{children}</div>
      </div>
    </div>
  );
}
