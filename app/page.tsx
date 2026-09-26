import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  HandHeart,
  Menu,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "@/app/actions/auth";

const NAV_ITEMS = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Our Physiotherapists", href: "#physiotherapists" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Contact", href: "#contact" },
];

const FEATURE_CARDS = [
  {
    icon: UserRound,
    title: "Personalised treatment",
    text: "Treatment plans tailored to your needs and goals.",
  },
  {
    icon: HandHeart,
    title: "Compassionate care",
    text: "We listen, we care, and we’re with you every step.",
  },
  {
    icon: CheckCircle2,
    title: "Proven results",
    text: "Evidence-based practices to help you recover and thrive.",
  },
  {
    icon: CalendarCheck2,
    title: "Flexible scheduling",
    text: "Choose a time that fits your busy life.",
  },
];

function LogoMark() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden="true">
      <path d="M5 17.5V3.8a1.8 1.8 0 0 1 1.8-1.8H9.8A5.2 5.2 0 0 1 15 7.2V8.3A5.2 5.2 0 0 1 9.8 13.5H7.4" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.7 2.7a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z" fill="#0F766E"/>
      <path d="M7.6 8.8h2.7" stroke="#0F766E" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/book");
  }

  return (
    <div className="min-h-screen bg-[#f4f6f7] text-[#10243b]">
      <header className="sticky top-0 z-40 border-b border-[#dfe7f3] bg-[#f4f6f7]/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
          <Link href="#home" className="flex items-center gap-2.5" aria-label="PhysioCare home">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#dfe7f3] bg-[#edf8f8]">
              <LogoMark />
            </div>
            <div className="leading-none">
              <div className="text-[17px] font-bold tracking-[-0.05em] text-[#0f2d3b]">PhysioCare</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#5b6e7d]">Booking</div>
            </div>
          </Link>

          <nav className="hidden items-center justify-center gap-7 text-[14px] font-medium text-[#516274] lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={item.label === "Home" ? "relative pb-1 text-[#1c4a5d] after:absolute after:bottom-[-10px] after:left-0 after:h-[2px] after:w-full after:bg-[#0f9fa7]" : "transition-colors hover:text-[#1c4a5d]"}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#0f9fa7] bg-[#0f9fa7] px-4 py-2 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#0b888e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfe7ea]"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#0f9fa7]">G</span>
                Sign in with Google
              </button>
            </form>
          </div>

          <div className="lg:hidden">
            <details className="relative">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[10px] border border-[#dfe7f3] bg-white text-[#1a2d3d] shadow-sm marker:hidden [&::-webkit-details-marker]:hidden">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-12 z-20 w-[220px] rounded-[14px] border border-[#dfe7f3] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                <nav className="flex flex-col gap-1 text-[14px] font-medium text-[#516274]">
                  {NAV_ITEMS.map((item) => (
                    <Link key={item.label} href={item.href} className="rounded-[10px] px-3 py-2 hover:bg-[#f3f8fb] hover:text-[#1c4a5d]">
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <form action={signInWithGoogle} className="mt-2 border-t border-[#edf2f6] pt-2">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#0f9fa7] bg-[#0f9fa7] px-4 py-2.5 text-[14px] font-semibold text-white"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#0f9fa7]">G</span>
                    Sign in with Google
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main id="home" className="bg-[#f4f6f7]">
        <section className="px-4 pb-16 pt-8 md:px-6 lg:px-8 lg:pb-24 lg:pt-12">
          <div className="mx-auto grid w-full max-w-[1240px] items-center gap-10 lg:grid-cols-[1.03fr_1.17fr]">
            <div className="max-w-[560px]">
              <div className="inline-flex items-center rounded-full border border-[#cfe8e7] bg-[#e9f7f6] px-4 py-2 text-[13px] font-medium text-[#0d7b7d] shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#d8f0ee] text-[10px] text-[#0d7b7d]">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                </span>
                Professional care. Personal attention.
              </div>

              <h1 className="mt-7 text-[52px] leading-[0.94] tracking-[-0.06em] text-[#10243b] md:text-[64px] lg:text-[74px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                <span className="block">Better movement.</span>
                <span className="block text-[#0f9fa7]">Better life.</span>
              </h1>

              <p className="mt-6 max-w-[560px] text-[16px] leading-[1.7] text-[#53657a] md:text-[18px]">
                Book a 45-minute session with our experienced physiotherapists and take the next step towards feeling better, moving better, and living better.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#0f9fa7] bg-[#0f9fa7] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_10px_18px_rgba(15,159,167,0.18)] transition-colors hover:bg-[#0b888e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfe7ea]"
                >
                  <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                  Book an Appointment
                </Link>

                <Link
                  href="#physiotherapists"
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#c3d5df] bg-white px-5 py-3 text-[15px] font-semibold text-[#15364d] transition-colors hover:bg-[#f5f9fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfe7ea]"
                >
                  View Our Physiotherapists
                </Link>
              </div>

              <div className="mt-8 grid max-w-[520px] grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex items-center gap-2 rounded-[12px] border border-[#dfe7f3] bg-[#edf7f8] px-3 py-2.5 text-[#18415d]">
                  <Clock3 className="h-4 w-4 text-[#0d7b7d]" aria-hidden="true" />
                  <span className="text-[12px] font-medium">45-Minute Sessions</span>
                </div>
                <div className="flex items-center gap-2 rounded-[12px] border border-[#dfe7f3] bg-[#edf7f8] px-3 py-2.5 text-[#18415d]">
                  <ShieldCheck className="h-4 w-4 text-[#0d7b7d]" aria-hidden="true" />
                  <span className="text-[12px] font-medium">Qualified Experts</span>
                </div>
                <div className="flex items-center gap-2 rounded-[12px] border border-[#dfe7f3] bg-[#edf7f8] px-3 py-2.5 text-[#18415d]">
                  <CalendarCheck2 className="h-4 w-4 text-[#0d7b7d]" aria-hidden="true" />
                  <span className="text-[12px] font-medium">Easy Booking</span>
                </div>
                <div className="flex items-center gap-2 rounded-[12px] border border-[#dfe7f3] bg-[#edf7f8] px-3 py-2.5 text-[#18415d]">
                  <ShieldCheck className="h-4 w-4 text-[#0d7b7d]" aria-hidden="true" />
                  <span className="text-[12px] font-medium">Your Privacy</span>
                </div>
              </div>
            </div>

            <div className="relative ml-auto w-full max-w-[630px]">
              <div className="overflow-hidden rounded-[28px] border border-[#e2e8f0] bg-[#edf5f9] shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
                <Image
                  src="/hero-image.png"
                  alt="Physiotherapist helping a patient move their shoulder during a treatment session"
                  width={1280}
                  height={900}
                  priority
                  className="h-[560px] w-full object-cover md:h-[640px]"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="px-4 pb-20 pt-2 md:px-6 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#5a758a]">Why choose us</p>
            <h2 className="mt-4 text-[42px] leading-[1.08] tracking-[-0.05em] text-[#12263a] md:text-[48px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Care you can trust. Results you can feel.
            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {FEATURE_CARDS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-[16px] border border-[#dfe7f3] bg-[#f8fbfd] p-6 text-left shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#dff1ee] bg-[#eafaf8] text-[#0b7a7f]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-[18px] font-semibold text-[#123049]">{title}</h3>
                  <p className="mt-2 text-[15px] leading-6 text-[#5d6f82]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="physiotherapists" className="bg-[#f3f6f9] px-4 py-14 md:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-[1240px] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[18px] border border-[#dde8f0] bg-[#ebf6f7] p-6 shadow-[0_1px_0_rgba(15,23,42,0.02)] md:p-8">
              <div className="flex items-center gap-3 text-[#0b7a7f]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d9f5f2] text-[#0b7a7f]">
                  <span className="text-[26px] font-bold">“</span>
                </div>
              </div>
              <p className="mt-5 max-w-[430px] text-[17px] leading-[1.8] text-[#13354d] md:text-[19px]">
                The team is amazing! My physiotherapist really listened and helped me get back to doing the things I love.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <span className="text-[15px] font-medium text-[#15364d]">— Jenna M.</span>
                <div className="flex items-center gap-1 text-[#f0b341]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" aria-hidden="true" />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="overflow-hidden rounded-[18px] border border-[#dfe7f3] bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                <Image
                  src="/hero-image.png"
                  alt="Physiotherapist discussing treatment with a patient"
                  width={960}
                  height={700}
                  className="h-[250px] w-full object-cover md:h-[310px]"
                />
              </div>
              <div className="rounded-[18px] border border-[#dfe7f3] bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                <h3 className="text-[22px] font-semibold leading-tight text-[#123049]">Ready to feel better?</h3>
                <p className="mt-2 text-[15px] leading-6 text-[#5d6f82]">Book your session in just a few clicks.</p>
                <Link
                  href="/book"
                  className="mt-5 inline-flex items-center gap-2 rounded-[10px] border border-[#0f9fa7] bg-[#0f9fa7] px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#0b888e]"
                >
                  <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                  Book an Appointment
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#f4f6f7] px-4 py-14 md:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-[1240px] gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: "Trusted by our patients", stat: "4.9/5 from 300+ reviews", icon: Star },
              { title: "Your information is safe", stat: "We value your privacy and keep your data secure.", icon: ShieldCheck },
              { title: "Local & convenient", stat: "Easy location and accessible care.", icon: CalendarCheck2 },
              { title: "We’re here to help", stat: "Have questions? Our team is ready to assist.", icon: UserRound },
            ].map(({ title, stat, icon: Icon }) => (
              <div key={title} className="flex items-start gap-3 rounded-[16px] border border-[#dfe7f3] bg-[#edf7f8] p-5 text-left">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#d9f3f1] text-[#0d7b7d]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#133049]">{title}</p>
                  <p className="mt-1 text-[14px] leading-5 text-[#5d6f82]">{stat}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-[#dfe7f3] bg-[#edf3f6] px-4 py-8 md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#dfe7f3] bg-white text-[#0f9fa7]">
              <LogoMark />
            </div>
            <span className="text-[15px] font-semibold text-[#0f2d3b]">PhysioCare Booking</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-5 text-[14px] font-medium text-[#516274] md:justify-end">
            <Link href="#home" className="hover:text-[#1c4a5d]">Home</Link>
            <Link href="#about" className="hover:text-[#1c4a5d]">About Us</Link>
            <Link href="#physiotherapists" className="hover:text-[#1c4a5d]">Our Physiotherapists</Link>
            <Link href="/privacy" className="hover:text-[#1c4a5d]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#1c4a5d]">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
