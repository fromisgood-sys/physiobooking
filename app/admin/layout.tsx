import Link from "next/link";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, avatar_url, role").eq("id", user.id).maybeSingle()
    : { data: null };
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const name = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? "Administrator";
  const initial = name.charAt(0).toUpperCase();
  const roleLabel = profile?.role === "admin" ? "Administrator" : profile?.role ?? "Administrator";

  return (
    <div className="flex min-h-screen bg-[#f4f7f8] text-[#183247]">
      <aside className="sticky top-0 hidden h-screen w-[216px] shrink-0 flex-col border-r border-[#e4eaed] bg-white px-3 py-4 lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 pb-6 pt-1" aria-label="PhysioCare Admin home">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d5e9e8] bg-[#eef8f7] text-[#148b86]" aria-hidden="true">✚</span>
          <span className="leading-none"><span className="block text-[15px] font-bold text-[#16334a]">PhysioCare</span><span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.18em] text-[#758899]">Admin</span></span>
        </Link>

        <AdminNav />

        <div className="mt-auto border-t border-[#edf1f3] pt-3">
          <details className="group relative">
            <summary className="flex min-h-[50px] cursor-pointer list-none items-center gap-2 rounded-[8px] px-2 marker:hidden [&::-webkit-details-marker]:hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6f3f2] text-[12px] font-semibold text-[#157c7e]">{initial}</span>}
              <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-[#234158]">{name}</span><span className="block text-[10px] text-[#7a8c99]">{roleLabel}</span></span>
              <ChevronDown className="h-3.5 w-3.5 text-[#718596]" aria-hidden="true" />
            </summary>
            <div className="absolute bottom-12 left-0 z-40 w-full rounded-[9px] border border-[#e0e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(25,53,70,0.12)]">
              <p className="truncate px-2 py-1.5 text-[10px] text-[#718596]">{name}</p>
              <form action={signOut}><button type="submit" className="flex min-h-10 w-full items-center gap-2 rounded-[7px] px-2 text-left text-[12px] font-medium text-[#536b7d] hover:bg-[#f4f8f9]"><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button></form>
            </div>
          </details>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[56px] items-center justify-between gap-3 border-b border-[#e3e9ed] bg-white px-3 sm:px-5">
          <details className="relative lg:hidden">
            <summary aria-label="Open admin navigation" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[8px] text-[#4e6779] hover:bg-[#f2f7f8] marker:hidden [&::-webkit-details-marker]:hidden"><Menu className="h-5 w-5" aria-hidden="true" /></summary>
            <div className="absolute left-0 top-12 z-40 w-[250px] rounded-[11px] border border-[#e0e7eb] bg-white p-3 shadow-[0_12px_30px_rgba(25,53,70,0.14)]"><AdminNav variant="drawer" /><div className="mt-3 border-t border-[#edf1f3] pt-2"><form action={signOut}><button type="submit" className="flex min-h-10 items-center gap-2 rounded-[7px] px-3 text-[13px] font-medium text-[#536b7d]"><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button></form></div></div>
          </details>

          <Link href="/admin" className="flex items-center gap-2 lg:hidden" aria-label="PhysioCare Admin home">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d5e9e8] bg-[#eef8f7] text-[14px] text-[#148b86]" aria-hidden="true">✚</span>
            <span className="leading-none"><span className="block text-[13px] font-bold text-[#16334a]">PhysioCare</span><span className="mt-0.5 block text-[7px] font-semibold uppercase tracking-[0.18em] text-[#758899]">Admin</span></span>
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-2.5">
            <details className="group relative">
              <summary aria-label="Administrator account menu" className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-[8px] px-1.5 hover:bg-[#f4f8f9] marker:hidden [&::-webkit-details-marker]:hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6f3f2] text-[12px] font-semibold text-[#157c7e]">{initial}</span>}
                <span className="hidden min-w-0 sm:block"><span className="block max-w-[160px] truncate text-[11px] font-semibold text-[#234158]">{name}</span><span className="block text-[10px] text-[#7a8c99]">{roleLabel}</span></span>
                <ChevronDown className="h-3.5 w-3.5 text-[#718596]" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-12 z-40 w-52 rounded-[9px] border border-[#e0e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(25,53,70,0.12)]"><p className="truncate px-2 py-1.5 text-[10px] text-[#718596]">{name}</p><form action={signOut}><button type="submit" className="flex min-h-10 w-full items-center gap-2 rounded-[7px] px-2 text-left text-[12px] font-medium text-[#536b7d] hover:bg-[#f4f8f9]"><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button></form></div>
            </details>
          </div>
        </header>

        <div className="min-w-0 flex-1 bg-[#f4f7f8] p-3 sm:p-5 lg:p-6">{children}</div>
      </div>
    </div>
  );
}
