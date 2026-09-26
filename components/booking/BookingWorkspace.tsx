"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { signOut } from "@/app/actions/auth";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  LockKeyhole,
  LoaderCircle,
  Menu,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { ConfirmForm } from "./ConfirmForm";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MonthCalendar } from "./MonthCalendar";
import { SlotGrid } from "./SlotGrid";
import type { Slot } from "@/lib/slots";
import { allSlotLabels, CLINIC_TZ, SESSION_MINUTES, weekdayOfDateLabel } from "@/lib/tz";

export interface WorkspacePhysio {
  id: string;
  fullName: string;
  specialisation: string | null;
  bio: string | null;
  photoUrl: string | null;
  availableWeekdays: number[];
}

const ALL_LABELS = allSlotLabels();

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({
  physio,
  size,
  square = false,
}: {
  physio: WorkspacePhysio;
  size: number;
  square?: boolean;
}) {
  const shape = square ? "rounded-[16px]" : "rounded-full";
  const style = { width: size, height: size };
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return physio.photoUrl && failedUrl !== physio.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={physio.photoUrl}
      alt=""
      style={style}
      onError={() => setFailedUrl(physio.photoUrl)}
      className={`shrink-0 ${shape} object-cover`}
    />
  ) : (
    <div
      aria-hidden="true"
      style={style}
      className={`flex shrink-0 items-center justify-center ${shape} bg-azure-soft text-[15px] font-semibold text-azure-hover`}
    >
      {initialsOf(physio.fullName)}
    </div>
  );
}

function firstBookableDate(todayLabel: string, weekdays: number[]): string {
  for (let i = 0; i < 60; i++) {
    const [y, m, d] = todayLabel.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + i));
    const label = next.toISOString().slice(0, 10);
    if (weekdays.includes(weekdayOfDateLabel(label))) return label;
  }
  return todayLabel;
}

export function BookingWorkspace({
  physios,
  todayLabel,
  physiotherapistError,
  profileName,
  avatarUrl,
  phoneNumber,
}: {
  physios: WorkspacePhysio[];
  todayLabel: string;
  physiotherapistError: boolean;
  profileName: string;
  avatarUrl: string | null;
  phoneNumber: string;
}) {
  const [physioId, setPhysioId] = useState(physios[0]?.id ?? "");
  const physio = physios.find((p) => p.id === physioId) ?? physios[0];
  const [selectedDate, setSelectedDate] = useState(() =>
    firstBookableDate(todayLabel, physios[0]?.availableWeekdays ?? [])
  );
  const [availabilityResult, setAvailabilityResult] = useState<{
    key: string;
    slots: Slot[];
    error: boolean;
  } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [availabilityRequest, setAvailabilityRequest] = useState(0);
  const selectedTherapist = useRef<HTMLButtonElement>(null);
  const availabilityKey = `${physio?.id ?? ""}:${selectedDate}:${availabilityRequest}`;
  const currentAvailability = availabilityResult?.key === availabilityKey ? availabilityResult : null;
  const slots = currentAvailability?.slots ?? null;
  const error = currentAvailability?.error ?? false;
  const selectedStart = selectedSlot ? toZonedTime(new Date(selectedSlot.startUtc), CLINIC_TZ) : null;

  useEffect(() => {
    selectedTherapist.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [physioId]);

  useEffect(() => {
    if (!physio) return;
    let cancelled = false;

    fetch(`/api/availability?physioId=${physio.id}&date=${selectedDate}`)
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setAvailabilityResult({ key: availabilityKey, slots: data.slots as Slot[], error: false });
        }
      })
      .catch(() => {
        if (!cancelled) setAvailabilityResult({ key: availabilityKey, slots: [], error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [physio, selectedDate, availabilityRequest, availabilityKey]);

  const initials = profileName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (physiotherapistError || !physio) {
    return (
      <div data-booking-root className="relative left-1/2 -my-6 min-h-[calc(100svh-64px)] w-screen -translate-x-1/2 bg-[#f6f8fa] text-[#142b42]">
        <style>{`body:has([data-booking-root]) > div > header { display: none; }`}</style>
        <BookingHeader profileName={profileName} avatarUrl={avatarUrl} initials={initials} />
        <main className="mx-auto flex min-h-[50vh] w-full max-w-[1280px] items-center justify-center px-4 py-12 sm:px-6">
          <div role="alert" className="max-w-md rounded-[14px] border border-[#dce5eb] bg-white p-6 text-center shadow-[0_2px_10px_rgba(17,39,58,0.04)]">
            <UserRound className="mx-auto h-8 w-8 text-[#6c8494]" aria-hidden="true" />
            <p className="mt-3 text-[15px] leading-6 text-[#536879]">
              {physiotherapistError ? "Couldn’t load physiotherapists. Try refreshing the page." : "No physiotherapists are available right now."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  function choosePhysio(next: WorkspacePhysio) {
    setPhysioId(next.id);
    setSelectedSlot(null);
    if (!next.availableWeekdays.includes(weekdayOfDateLabel(selectedDate))) {
      setSelectedDate(firstBookableDate(todayLabel, next.availableWeekdays));
    }
  }

  return (
    <div data-booking-root className="relative left-1/2 -my-6 min-h-[calc(100svh-64px)] w-screen -translate-x-1/2 overflow-x-hidden bg-[#f6f8fa] text-[#142b42]">
      <style>{`body:has([data-booking-root]) > div > header { display: none; } body:has([data-booking-root]) [data-slot="dialog-overlay"] { background: rgba(17, 32, 44, 0.38); }`}</style>
      <BookingHeader profileName={profileName} avatarUrl={avatarUrl} initials={initials} />

      <main className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mb-5 lg:mb-6">
          <h1 className="text-[24px] font-bold leading-[30px] tracking-[-0.025em] text-[#142b42] sm:text-[28px] sm:leading-[34px]">
            Choose your physiotherapist
          </h1>
          <p className="mt-1 text-[14px] leading-5 text-[#617386] sm:text-[15px]">
            Select a physiotherapist to view availability and book your session.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,0.35fr)_minmax(0,0.65fr)] lg:gap-5 xl:gap-6">
          <aside aria-label="Our physiotherapists" className="min-w-0 rounded-[12px] border border-[#e0e7ed] bg-white p-3 shadow-[0_2px_10px_rgba(17,39,58,0.035)] sm:p-4 lg:p-3">
            <h2 className="px-2 pb-3 pt-1 text-[15px] font-semibold text-[#1a344a]">Our Physiotherapists</h2>

            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
              {physios.map((person) => {
                const active = person.id === physio.id;
                return (
                  <li key={person.id} className="shrink-0 lg:shrink">
                    <button
                      ref={active ? selectedTherapist : undefined}
                      type="button"
                      aria-pressed={active}
                      onClick={() => choosePhysio(person)}
                      className={`group flex min-h-[106px] w-[104px] flex-col items-center justify-center gap-2 rounded-[11px] border px-2 py-3 text-center transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6] focus-visible:ring-offset-2 lg:min-h-[74px] lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2 lg:text-left ${
                        active
                          ? "border-[#56afb0] bg-[#f0fafa]"
                          : "border-transparent bg-white hover:border-[#d7e7e8] hover:bg-[#f8fbfc]"
                      }`}
                    >
                      <Avatar physio={person} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold leading-4 text-[#16334a] lg:text-[14px]">
                          {person.fullName}
                        </span>
                        {person.specialisation && (
                          <span className="mt-0.5 hidden text-[12px] leading-4 text-[#587083] lg:block">
                            {person.specialisation}
                          </span>
                        )}
                        <span className="mt-1 flex items-center justify-center gap-1 text-[11px] text-[#587083] lg:justify-start">
                          <Star className="h-3 w-3 fill-[#f4b544] text-[#f4b544]" aria-hidden="true" />
                          <span>4.9</span>
                          <span className="hidden lg:inline">Sample rating</span>
                        </span>
                      </span>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-[#188b8e] lg:block" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-2 flex items-center gap-3 rounded-[10px] border border-[#e7edf0] bg-[#f9fbfc] p-3 lg:mt-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f5f5] text-[#16888b]">
                <CircleHelp className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[#18374d]">Not sure who to choose?</p>
                <p className="mt-0.5 text-[11px] leading-4 text-[#64788a]">Our team is here to help you.</p>
              </div>
              <span className="hidden text-[10px] text-[#718394] sm:block">Please speak with clinic reception.</span>
            </div>
          </aside>

          <section aria-label={`Availability for ${physio.fullName}`} className="min-w-0 space-y-3">
            <div className="flex min-w-0 flex-col gap-3 rounded-[12px] border border-[#e0e7ed] bg-white p-4 shadow-[0_2px_10px_rgba(17,39,58,0.035)] sm:flex-row sm:items-center sm:gap-4 sm:p-5">
              <Avatar physio={physio} size={88} square />
              <div className="min-w-0 flex-1">
                <h2 className="text-[21px] font-bold leading-7 tracking-[-0.02em] text-[#142b42] sm:text-[23px]">
                  {physio.fullName}
                </h2>
                {physio.specialisation && <p className="mt-0.5 text-[13px] font-semibold text-[#168589]">{physio.specialisation}</p>}
                {physio.bio && <p className="mt-2 line-clamp-2 text-[12px] leading-[18px] text-[#596f80] sm:max-w-[560px]">{physio.bio}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#425c70]">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#168589]" aria-hidden="true" />Professional care</span>
                  {physio.specialisation && <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#168589]" aria-hidden="true" />{physio.specialisation}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-start rounded-[9px] bg-[#fbfcfd] px-2 py-1.5 text-[#18374d] sm:self-center">
                <Star className="h-4 w-4 fill-[#f4b544] text-[#f4b544]" aria-hidden="true" />
                <span className="text-[14px] font-semibold">4.9</span>
                <span className="text-[10px] text-[#748697]">sample</span>
              </div>
            </div>

            <div className="rounded-[12px] border border-[#e0e7ed] bg-white p-3 shadow-[0_2px_10px_rgba(17,39,58,0.035)] sm:p-4">
              <div className="mb-1">
                <h3 className="text-[14px] font-bold text-[#18344b]">1. Choose a date</h3>
                <p className="mt-0.5 text-[11px] text-[#718394]">All times shown in Africa/Windhoek (CAT)</p>
              </div>
              <MonthCalendar
                todayLabel={todayLabel}
                selectedDate={selectedDate}
                availableWeekdays={physio.availableWeekdays}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
              />
            </div>

            <div className="rounded-[12px] border border-[#e0e7ed] bg-white p-3 shadow-[0_2px_10px_rgba(17,39,58,0.035)] sm:p-4">
              <h3 className="text-[14px] font-bold text-[#18344b]">2. Choose an available time</h3>
              <div className="mt-3">
                {error && (
                  <div role="alert" className="flex flex-col gap-2 rounded-[9px] bg-[#fff4f2] px-3 py-2 text-[13px] text-[#a73730] sm:flex-row sm:items-center sm:justify-between">
                    <span>Couldn’t load times for this date.</span>
                    <button type="button" onClick={() => setAvailabilityRequest((request) => request + 1)} className="min-h-10 self-start rounded-[8px] px-3 font-semibold text-[#8e302a] underline underline-offset-2 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8847f]">Try again</button>
                  </div>
                )}
                {!error && slots === null && (
                  <p role="status" aria-live="polite" className="flex min-h-10 items-center gap-2 text-[13px] text-[#64798a]">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[#16888b] motion-reduce:animate-none" aria-hidden="true" />
                    Loading available times…
                  </p>
                )}
                {!error && slots !== null && slots.length === 0 && <p className="rounded-[9px] bg-[#f8fafb] px-3 py-3 text-[13px] text-[#607486]">No times available on this day.</p>}
                {!error && slots !== null && slots.length > 0 && (
                  <SlotGrid allLabels={ALL_LABELS} slots={slots} selectedLabel={selectedSlot?.label ?? null} onSelect={setSelectedSlot} />
                )}
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[#667b8c]"><Clock3 className="h-3.5 w-3.5 text-[#17878b]" aria-hidden="true" />All sessions are {SESSION_MINUTES} minutes</p>
            </div>

            <div className="rounded-[12px] border border-[#e0e7ed] bg-white p-3 shadow-[0_2px_10px_rgba(17,39,58,0.035)] sm:p-4">
              <h3 className="text-[14px] font-bold text-[#18344b]">3. Confirm your booking</h3>
              <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
                {selectedSlot ? (
                  <DialogTrigger
                    render={<button type="button" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#078b8e] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#06777a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74c4c5] focus-visible:ring-offset-2" />}
                  >
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />Book Appointment
                  </DialogTrigger>
                ) : (
                  <button type="button" disabled className="mt-3 flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[8px] bg-[#a9cbcc] px-4 text-[14px] font-semibold text-white" aria-describedby="booking-secure-note">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />Book Appointment
                  </button>
                )}
                {selectedSlot && selectedStart && (
                  <DialogContent
                    showCloseButton={false}
                    className="!fixed !inset-y-0 !left-auto !right-0 !top-0 !h-dvh !w-full !max-w-[460px] !translate-x-0 !translate-y-0 !flex flex-col gap-0 overflow-hidden rounded-none border-l border-[#e1e8ed] bg-white !p-0 text-[#172f44] shadow-[-12px_0_36px_rgba(17,39,58,0.14)] outline-none duration-300 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right max-sm:!inset-x-0 max-sm:!left-0 max-sm:!right-0 max-sm:!top-auto max-sm:!bottom-0 max-sm:!h-[92dvh] max-sm:rounded-t-[18px] max-sm:rounded-b-none max-sm:border-l-0 max-sm:border-t max-sm:shadow-[0_-12px_36px_rgba(17,39,58,0.16)] max-sm:data-open:slide-in-from-bottom max-sm:data-closed:slide-out-to-bottom"
                  >
                    <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#c9d3da] sm:hidden" aria-hidden="true" />
                    <DialogHeader className="relative shrink-0 border-b border-[#e9eef1] px-5 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
                      <DialogTitle className="pr-10 text-[19px] font-bold leading-6 tracking-[-0.02em] text-[#172f44]">
                        Review &amp; confirm your booking
                      </DialogTitle>
                      <DialogDescription className="mt-1.5 max-w-[360px] text-[12px] leading-[18px] text-[#617587]">
                        Please review your appointment details and provide some additional information.
                      </DialogDescription>
                      <DialogClose
                        aria-label="Close booking confirmation"
                        render={<button type="button" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-[8px] text-[#52697b] hover:bg-[#f2f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6] sm:right-5 sm:top-5" />}
                      >
                        <X className="h-5 w-5" aria-hidden="true" />
                      </DialogClose>
                    </DialogHeader>

                    <section aria-labelledby="appointment-details-heading" className="mx-5 mt-4 shrink-0 rounded-[10px] border border-[#e1e8ed] bg-white sm:mx-6">
                      <h3 id="appointment-details-heading" className="px-3 pt-3 text-[12px] font-bold text-[#20394e]">Your appointment</h3>
                      <dl className="mt-2 divide-y divide-[#edf1f3]">
                        <div className="flex min-h-[58px] items-center gap-3 px-3 py-2.5">
                          <dt className="flex w-[112px] shrink-0 items-center gap-2 text-[11px] font-medium text-[#64798a]">
                            <UserRound className="h-4 w-4 text-[#16888b]" aria-hidden="true" />Physiotherapist
                          </dt>
                          <dd className="flex min-w-0 items-center gap-2.5">
                            <Avatar physio={physio} size={34} />
                            <span className="min-w-0">
                              <span className="block truncate text-[11px] font-semibold text-[#20394e]">{physio.fullName}</span>
                              {physio.specialisation && <span className="mt-0.5 block truncate text-[10px] text-[#687f90]">{physio.specialisation}</span>}
                            </span>
                          </dd>
                        </div>
                        <div className="flex min-h-[48px] items-center gap-3 px-3 py-2">
                          <dt className="flex w-[112px] shrink-0 items-center gap-2 text-[11px] font-medium text-[#64798a]"><CalendarDays className="h-4 w-4 text-[#16888b]" aria-hidden="true" />Date</dt>
                          <dd className="text-[11px] font-medium text-[#304b60]">{format(selectedStart, "EEEE, d MMMM yyyy")}</dd>
                        </div>
                        <div className="flex min-h-[48px] items-center gap-3 px-3 py-2">
                          <dt className="flex w-[112px] shrink-0 items-center gap-2 text-[11px] font-medium text-[#64798a]"><Clock3 className="h-4 w-4 text-[#16888b]" aria-hidden="true" />Time</dt>
                          <dd className="text-[11px] font-medium text-[#304b60]">{format(selectedStart, "HH:mm")} ({SESSION_MINUTES} minutes)</dd>
                        </div>
                      </dl>
                    </section>

                    <div className="mx-5 mt-3 flex shrink-0 items-start gap-2 rounded-[10px] border border-[#e3edf1] bg-[#f5f9fb] px-3 py-2.5 text-[11px] leading-4 text-[#536c7e] sm:mx-6">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16888b]" aria-hidden="true" />
                      <p>You can reschedule or cancel your appointment from your appointments page.</p>
                    </div>

                    <ConfirmForm
                      physioId={physio.id}
                      startUtc={selectedSlot.startUtc}
                      initialPhone={phoneNumber}
                      presentation="panel"
                    />
                  </DialogContent>
                )}
              </Dialog>
              <p id="booking-secure-note" className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#718394]"><LockKeyhole className="h-3 w-3" aria-hidden="true" />Your booking is secure and confidential</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function BookingHeader({
  profileName,
  avatarUrl,
  initials,
}: {
  profileName: string;
  avatarUrl: string | null;
  initials: string;
}) {
  return (
    <header className="border-b border-[#e1e8ed] bg-white">
      <div className="mx-auto flex h-[60px] w-full max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <details className="relative lg:hidden">
          <summary aria-label="Open navigation menu" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-[9px] text-[#254156] hover:bg-[#f3f7f8] marker:hidden [&::-webkit-details-marker]:hidden">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </summary>
          <nav className="absolute left-0 top-12 z-30 w-52 rounded-[12px] border border-[#e0e7ed] bg-white p-2 shadow-[0_8px_24px_rgba(17,39,58,0.12)]">
            <Link href="/book" className="block rounded-[8px] px-3 py-2.5 text-[14px] font-medium text-[#19384e] hover:bg-[#f2f8f8]">Home</Link>
            <Link href="/appointments" className="block rounded-[8px] px-3 py-2.5 text-[14px] font-medium text-[#19384e] hover:bg-[#f2f8f8]">My Bookings</Link>
            <Link href="/book" aria-current="page" className="block rounded-[8px] bg-[#edf8f8] px-3 py-2.5 text-[14px] font-semibold text-[#147d82]">Book Appointment</Link>
            <details className="rounded-[8px] px-3 py-2.5">
              <summary className="cursor-pointer text-[14px] font-medium text-[#19384e]">Help &amp; Support</summary>
              <p className="mt-1 text-[12px] leading-5 text-[#617386]">For booking help, please speak with clinic reception.</p>
            </details>
          </nav>
        </details>

        <Link href="/book" className="flex items-center gap-2.5 max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2" aria-label="Physio Booking home">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e6e9] bg-[#edf8f7]">
            <svg width="21" height="21" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M8 29V6.5C8 5.7 8.7 5 9.5 5H17a8 8 0 0 1 0 16h-4" stroke="#13858a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24.5" cy="5" r="2.5" fill="#8bc9c7" />
            </svg>
          </span>
          <span className="leading-none">
            <span className="block text-[15px] font-bold tracking-[-0.03em] text-[#142b42]">PhysioCare</span>
            <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.19em] text-[#6c7e8d]">Booking</span>
          </span>
        </Link>

        <nav className="ml-6 hidden h-full items-center gap-1 lg:flex" aria-label="Client navigation">
          <Link href="/book" className="flex h-full items-center px-3 text-[13px] font-medium text-[#425a6d] hover:text-[#087f83]">Home</Link>
          <Link href="/appointments" className="flex h-full items-center px-3 text-[13px] font-medium text-[#425a6d] hover:text-[#087f83]">My Bookings</Link>
          <Link href="/book" aria-current="page" className="flex h-full items-center border-b-2 border-[#078b8e] px-3 text-[13px] font-semibold text-[#087f83]">Book Appointment</Link>
          <details className="relative">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-medium text-[#425a6d] hover:bg-[#f3f7f8] marker:hidden [&::-webkit-details-marker]:hidden">
              <CircleHelp className="h-4 w-4" aria-hidden="true" />Help &amp; Support
            </summary>
            <p className="absolute left-0 top-12 z-30 w-60 rounded-[12px] border border-[#e0e7ed] bg-white p-3 text-[12px] leading-5 text-[#617386] shadow-[0_8px_24px_rgba(17,39,58,0.12)]">Please contact clinic reception for help choosing a physiotherapist or booking an appointment.</p>
          </details>
        </nav>

        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <details className="group relative">
            <summary aria-label="Patient profile menu" className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-[9px] px-1.5 hover:bg-[#f4f7f8] marker:hidden [&::-webkit-details-marker]:hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e3f3f2] text-[12px] font-semibold text-[#147d82]">{initials || <UserRound className="h-4 w-4" />}</span>
              )}
              <span className="hidden max-w-[130px] truncate text-[12px] font-semibold text-[#20394d] sm:inline">{profileName}</span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-[#6c7e8d] sm:block" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-12 z-30 w-56 rounded-[12px] border border-[#e0e7ed] bg-white p-2 shadow-[0_8px_24px_rgba(17,39,58,0.12)]">
              <p className="truncate px-3 py-2 text-[12px] text-[#738596]">{profileName}</p>
              <Link href="/appointments" className="block rounded-[8px] px-3 py-2.5 text-[14px] font-medium text-[#19384e] hover:bg-[#f2f8f8]">My appointments</Link>
              <form action={signOut}>
                <button type="submit" className="w-full rounded-[8px] px-3 py-2.5 text-left text-[14px] font-medium text-[#536879] hover:bg-[#f2f8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76c6c6]">Sign out</button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
