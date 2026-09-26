"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, CalendarX2, ChevronDown, CircleHelp, Menu, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AppointmentCard, type AppointmentRow } from "./AppointmentCard";
import { AppointmentDetails } from "./AppointmentDetails";

export interface AppointmentsTabsProps {
  initialUpcoming: AppointmentRow[];
  initialPrevious: AppointmentRow[];
  profileName: string;
  avatarUrl: string | null;
  phoneNumber: string;
  loadError: boolean;
}

const TABS = ["upcoming", "previous"] as const;

export function AppointmentsTabs({
  initialUpcoming,
  initialPrevious,
  profileName,
  avatarUrl,
  phoneNumber: initialPhoneNumber,
  loadError,
}: AppointmentsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [previous, setPrevious] = useState(initialPrevious);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(loadError);
  const tab = searchParams.get("tab") === "previous" ? "previous" : "upcoming";

  async function refresh() {
    const res = await fetch("/api/appointments/me", { cache: "no-store" });
    if (!res.ok) {
      setLoadFailed(true);
      return;
    }
    const data = await res.json();
    setLoadFailed(false);
    setUpcoming(data.upcoming ?? []);
    setPrevious(data.past ?? []);
    setPhoneNumber(data.phone ?? "");
    const currentTab = searchParams.get("tab") === "previous" ? "previous" : "upcoming";
    const currentRows: AppointmentRow[] = currentTab === "upcoming" ? data.upcoming ?? [] : data.past ?? [];
    const requestedReference = searchParams.get("appointment");
    const nextSelection = currentRows.find((appointment) => appointment.reference === requestedReference) ?? currentRows[0] ?? null;
    if (nextSelection?.reference !== requestedReference) {
      updateUrl(currentTab, nextSelection?.reference ?? null, true);
    }
  }

  const rows = tab === "upcoming" ? upcoming : previous;
  const requestedReference = searchParams.get("appointment");
  const selected = rows.find((appointment) => appointment.reference === requestedReference) ?? rows[0] ?? null;
  const selectedId = selected?.id ?? null;
  const detailsVisible = Boolean(selected && selected.id !== dismissedId);

  function updateUrl(nextTab: (typeof TABS)[number], reference: string | null, replace = false) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    if (reference) params.set("appointment", reference);
    else params.delete("appointment");
    const url = `${pathname}?${params.toString()}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }

  function selectTab(nextTab: (typeof TABS)[number]) {
    const nextRows = nextTab === "upcoming" ? upcoming : previous;
    const nextReference = nextRows[0]?.reference ?? null;
    setDismissedId(null);
    setMobileDetailsOpen(false);
    updateUrl(nextTab, nextReference);
  }

  function selectAppointment(appointment: AppointmentRow) {
    setDismissedId(null);
    updateUrl(tab, appointment.reference, true);
    if (window.matchMedia("(max-width: 1023px)").matches) setMobileDetailsOpen(true);
  }

  function closeDesktopDetails() {
    if (selectedId) {
      setDismissedId(selectedId);
      window.requestAnimationFrame(() => document.getElementById(`appointment-${selectedId}`)?.focus());
    }
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextTab = tab === "upcoming" ? "previous" : "upcoming";
    selectTab(nextTab);
    document.getElementById(`bookings-tab-${nextTab}`)?.focus();
  }

  return (
    <div data-my-bookings className="relative left-1/2 -my-6 min-h-[calc(100svh-64px)] w-screen -translate-x-1/2 overflow-x-hidden bg-[#f6f8fa] text-[#142b42]">
      <style>{`body:has([data-my-bookings]) > div > header { display: none; } body:has([data-my-bookings]) [data-slot="dialog-overlay"] { background: rgba(17, 32, 44, 0.38); }`}</style>
      <ClientHeader profileName={profileName} avatarUrl={avatarUrl} />
      <main className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <header className="mb-5">
          <h1 className="text-[25px] font-bold leading-[32px] tracking-[-0.025em] text-[#142b42] sm:text-[28px]">My Bookings</h1>
          <p className="mt-1 text-[14px] leading-5 text-[#617386]">View and manage your upcoming and previous appointments.</p>
        </header>

        <div className="flex border-b border-[#dfe7eb]" role="tablist" aria-label="Bookings">
          {TABS.map((item) => {
            const count = item === "upcoming" ? upcoming.length : previous.length;
            const active = item === tab;
            return (
              <button key={item} id={`bookings-tab-${item}`} type="button" role="tab" aria-selected={active} aria-controls="bookings-panel" onClick={() => selectTab(item)} onKeyDown={handleTabKeyDown} className={`min-h-11 border-b-2 px-3 text-[13px] font-semibold capitalize transition-colors sm:px-4 ${active ? "border-[#078b8e] text-[#087f83]" : "border-transparent text-[#748697] hover:text-[#304b60]"}`}>
                {item === "upcoming" ? "Upcoming" : "Previous"} <span className="ml-0.5 tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>

        <div id="bookings-panel" role="tabpanel" aria-labelledby={`bookings-tab-${tab}`} className="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.95fr)] lg:items-start lg:gap-5">
          <section aria-label={`${tab === "upcoming" ? "Upcoming" : "Previous"} bookings`} className="min-w-0">
            {loadFailed && <p role="alert" className="mb-3 rounded-[9px] bg-[#fff3f1] px-3 py-2 text-[13px] text-[#a73730]">Couldn’t load your bookings. Please refresh the page.</p>}
            {!loadFailed && rows.length === 0 && (
              <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-[11px] border border-[#e1e8ed] bg-white px-5 py-10 text-center">
                <CalendarX2 className="h-6 w-6 text-[#8193a0]" aria-hidden="true" />
                <p className="text-[13px] text-[#607688]">{tab === "upcoming" ? "No upcoming bookings." : "No previous bookings yet."}</p>
                {tab === "upcoming" && <Link href="/book" className="mt-1 inline-flex min-h-10 items-center gap-1.5 rounded-[8px] bg-[#087f83] px-3 text-[12px] font-semibold text-white hover:bg-[#06777a]"><CalendarPlus className="h-4 w-4" aria-hidden="true" />Book Appointment</Link>}
              </div>
            )}
            <div className="space-y-2.5">
              {rows.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} selected={appointment.id === selectedId} onSelect={() => selectAppointment(appointment)} />
              ))}
            </div>
          </section>

          <div className="hidden min-w-0 lg:block">
            {selected && detailsVisible ? (
              <div className="sticky top-4 max-h-[calc(100svh-32px)] overflow-hidden rounded-[11px] border border-[#e1e8ed] bg-white shadow-[0_2px_10px_rgba(17,39,58,0.035)]">
                <AppointmentDetails appointment={selected} phoneNumber={phoneNumber} onChanged={refresh} onClose={closeDesktopDetails} />
              </div>
            ) : (
              <div className="flex min-h-44 items-center justify-center rounded-[11px] border border-[#e1e8ed] bg-white px-5 text-center text-[13px] text-[#718596]">Select a booking to see its details.</div>
            )}
          </div>
        </div>

        <Dialog open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
          {selected && (
            <DialogContent showCloseButton={false} className="!fixed !inset-x-0 !left-0 !right-0 !top-auto !bottom-0 !h-[92dvh] !max-h-[92dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !flex flex-col gap-0 overflow-hidden rounded-t-[18px] rounded-b-none border-t border-[#e1e8ed] bg-white !p-0 shadow-[0_-12px_36px_rgba(17,39,58,0.16)] outline-none duration-300 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom lg:hidden">
              <DialogTitle className="sr-only">Appointment Details</DialogTitle>
              <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#c9d3da]" aria-hidden="true" />
              <div className="min-h-0 flex-1"><AppointmentDetails appointment={selected} phoneNumber={phoneNumber} onChanged={refresh} onClose={() => setMobileDetailsOpen(false)} /></div>
            </DialogContent>
          )}
        </Dialog>
      </main>
    </div>
  );
}

function ClientHeader({ profileName, avatarUrl }: { profileName: string; avatarUrl: string | null }) {
  const initials = profileName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return (
    <header className="border-b border-[#e1e8ed] bg-white">
      <div className="mx-auto flex h-[60px] w-full max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <details className="relative lg:hidden">
          <summary aria-label="Open navigation menu" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-[9px] text-[#254156] hover:bg-[#f3f7f8] marker:hidden [&::-webkit-details-marker]:hidden"><Menu className="h-5 w-5" aria-hidden="true" /></summary>
          <nav className="absolute left-0 top-12 z-30 w-52 rounded-[12px] border border-[#e0e7ed] bg-white p-2 shadow-[0_8px_24px_rgba(17,39,58,0.12)]">
            <Link href="/book" className="block rounded-[8px] px-3 py-2.5 text-[14px] font-medium text-[#19384e] hover:bg-[#f2f8f8]">Home</Link>
            <Link href="/appointments" className="block rounded-[8px] bg-[#edf8f8] px-3 py-2.5 text-[14px] font-semibold text-[#147d82]">My Bookings</Link>
            <Link href="/book" className="block rounded-[8px] px-3 py-2.5 text-[14px] font-medium text-[#19384e] hover:bg-[#f2f8f8]">Book Appointment</Link>
            <details className="rounded-[8px] px-3 py-2.5"><summary className="cursor-pointer text-[14px] font-medium text-[#19384e]">Help &amp; Support</summary><p className="mt-1 text-[12px] leading-5 text-[#617386]">Please contact clinic reception for help.</p></details>
          </nav>
        </details>

        <Link href="/book" className="flex items-center gap-2.5 max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2" aria-label="PhysioCare home">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e6e9] bg-[#edf8f7]"><svg width="21" height="21" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 29V6.5C8 5.7 8.7 5 9.5 5H17a8 8 0 0 1 0 16h-4" stroke="#13858a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="24.5" cy="5" r="2.5" fill="#8bc9c7"/></svg></span>
          <span className="leading-none"><span className="block text-[15px] font-bold tracking-[-0.03em] text-[#142b42]">PhysioCare</span><span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.19em] text-[#6c7e8d]">Booking</span></span>
        </Link>

        <nav className="ml-6 hidden h-full items-center gap-1 lg:flex" aria-label="Client navigation">
          <Link href="/book" className="flex h-full items-center px-3 text-[13px] font-medium text-[#425a6d] hover:text-[#087f83]">Home</Link>
          <Link href="/appointments" aria-current="page" className="flex h-full items-center border-b-2 border-[#078b8e] px-3 text-[13px] font-semibold text-[#087f83]">My Bookings</Link>
          <Link href="/book" className="flex h-full items-center px-3 text-[13px] font-medium text-[#425a6d] hover:text-[#087f83]">Book Appointment</Link>
          <details className="relative"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium text-[#425a6d] hover:bg-[#f3f7f8] marker:hidden [&::-webkit-details-marker]:hidden"><CircleHelp className="h-4 w-4" aria-hidden="true"/>Help &amp; Support</summary><p className="absolute left-0 top-12 z-30 w-60 rounded-[12px] border border-[#e0e7ed] bg-white p-3 text-[12px] leading-5 text-[#617386] shadow-[0_8px_24px_rgba(17,39,58,0.12)]">Please contact clinic reception for help with your appointments.</p></details>
        </nav>

        <details className="group relative ml-auto">
          <summary aria-label="Client account menu" className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-[9px] px-1.5 hover:bg-[#f4f7f8] marker:hidden [&::-webkit-details-marker]:hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e3f3f2] text-[12px] font-semibold text-[#147d82]">{initials || <UserRound className="h-4 w-4" />}</span>}
            <span className="hidden max-w-[130px] truncate text-[12px] font-semibold text-[#20394d] sm:block">{profileName}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-[#6c7e8d] sm:block" aria-hidden="true" />
          </summary>
          <div className="absolute right-0 top-12 z-30 w-56 rounded-[12px] border border-[#e0e7ed] bg-white p-2 shadow-[0_8px_24px_rgba(17,39,58,0.12)]">
            <p className="truncate px-3 py-2 text-[12px] text-[#738596]">{profileName}</p>
            <Link href="/appointments" className="block rounded-[8px] px-3 py-2.5 text-[14px] font-medium text-[#19384e] hover:bg-[#f2f8f8]">My Bookings</Link>
            <Link href="/book" className="block rounded-[8px] px-3 py-2.5 text-[14px] font-medium text-[#19384e] hover:bg-[#f2f8f8]">Book Appointment</Link>
            <form action={signOut}><button type="submit" className="w-full rounded-[8px] px-3 py-2.5 text-left text-[14px] font-medium text-[#536879] hover:bg-[#f2f8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6]">Sign out</button></form>
          </div>
        </details>
      </div>
    </header>
  );
}
