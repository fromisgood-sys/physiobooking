import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "@/app/actions/auth";

const FEATURES = [
  {
    title: "Choose your physiotherapist",
    body: "Browse real profiles and specialisations, then pick who you'd like to see. You can change your mind next time.",
    accent: true,
  },
  {
    title: "Pick a time that works",
    body: "A live day strip and time grid show only genuinely free 45-minute slots — nothing double-booked, nothing stale.",
    accent: false,
  },
  {
    title: "Manage it yourself",
    body: "Reschedule or cancel from your own appointments page, any time before your session starts. No phone call needed.",
    accent: false,
  },
  {
    title: "Synced to your calendar",
    body: "Every booking creates a Google Calendar event automatically, with reminders, so it's never just an email you forget.",
    accent: true,
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/book");
  }

  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-6 py-4">
          <span className="text-[15px] font-bold tracking-[-0.01em] text-ink">
            Physio Booking
          </span>
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex h-10 items-center justify-center rounded-btn border border-line-strong bg-paper px-4 text-[15px] font-medium text-ink transition-colors duration-150 ease-out hover:bg-paper-tint"
            >
              Sign in
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="bg-paper px-6 py-16 lg:py-24">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center text-center">
            <h1 className="max-w-lg text-[44px] leading-[48px] font-bold tracking-[-0.03em] text-ink lg:text-[60px] lg:leading-[62px]">
              Need physio?
              <br />
              You&rsquo;re in the right place.
            </h1>
            <p className="mt-6 max-w-sm text-[15px] leading-6 text-ink-soft">
              Book a 45-minute session with a physiotherapist you trust. Takes a few clicks.
            </p>
            <form action={signInWithGoogle} className="mt-8">
              <button
                type="submit"
                className="flex h-11 items-center justify-center rounded-full bg-azure px-6 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover"
              >
                Sign in with Google
              </button>
            </form>

            <div className="mt-16 w-full max-w-[880px] overflow-hidden rounded-block border border-line shadow-[var(--shadow-float)]">
              <Image
                src="/screenshots/physio-chooser.png"
                alt="The physiotherapist chooser screen in Physio Booking, showing four real physiotherapist profiles"
                width={1024}
                height={720}
                className="w-full"
                priority
              />
            </div>
          </div>
        </section>

        {/* Honest stats */}
        <section className="bg-paper-tint px-6 py-16 lg:py-24">
          <div className="mx-auto grid w-full max-w-[1120px] grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-card border border-line bg-paper p-6">
              <p className="text-[56px] font-bold leading-[56px] tracking-[-0.02em] tabular-nums text-azure">
                4
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
                Physiotherapists
              </p>
            </div>
            <div className="rounded-card border border-line bg-paper p-6">
              <p className="text-[56px] font-bold leading-[56px] tracking-[-0.02em] tabular-nums text-azure">
                45
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
                Minutes per session
              </p>
            </div>
            <div className="rounded-card border border-line bg-paper p-6">
              <p className="text-[32px] font-bold leading-[38px] tracking-[-0.02em] tabular-nums text-azure">
                08:00&ndash;17:00
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
                Mon&ndash;Fri clinic hours
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-carbon px-6 py-16 lg:py-24">
          <div className="mx-auto w-full max-w-[1120px]">
            <h2 className="max-w-md text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-white">
              Everything a booking
              <br />
              should be.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={`rounded-card p-6 ${
                    f.accent ? "bg-azure" : "bg-carbon-raised border border-carbon-line"
                  }`}
                >
                  <p className="text-[18px] font-semibold leading-6 tracking-[-0.01em] text-white">
                    {f.title}
                  </p>
                  <p
                    className={`mt-2 text-[15px] leading-6 ${
                      f.accent ? "text-white/85" : "text-white/70"
                    }`}
                  >
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Booking in a few clicks */}
        <section className="bg-paper px-6 py-16 lg:py-24">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-10 lg:flex-row lg:items-center">
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
                Booking takes a few clicks.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-6 text-ink-soft">
                Pick a day, see the real times still open that day, confirm, done. Past dates and
                already-booked times are never shown as available.
              </p>
            </div>
            <div className="w-full max-w-[520px] overflow-hidden rounded-block border border-line shadow-[var(--shadow-float)]">
              <Image
                src="/screenshots/slot-picker.png"
                alt="The day and time picker in Physio Booking, showing available 45-minute slots for a physiotherapist"
                width={1024}
                height={620}
                className="w-full"
              />
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-azure px-6 py-16 text-center lg:py-20">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center">
            <h2 className="max-w-md text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-white">
              Ready when you are.
            </h2>
            <form action={signInWithGoogle} className="mt-8">
              <button
                type="submit"
                className="flex h-11 items-center justify-center rounded-btn bg-white px-6 text-[15px] font-medium text-azure transition-colors duration-150 ease-out hover:bg-white/90"
              >
                Sign in with Google
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper-tint px-6 py-10">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-[15px] font-medium text-ink">Physio Booking</p>
          <nav className="flex gap-6 text-[15px] text-ink-soft">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
