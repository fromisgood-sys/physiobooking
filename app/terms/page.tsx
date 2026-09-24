export const metadata = {
  title: "Terms of Service — Physio Booking",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        Terms of Service
      </h1>
      <p className="mt-2 text-[15px] text-ink-muted">Last updated 24 September 2026</p>

      <div className="mt-10 flex flex-col gap-8 text-[15px] leading-6 text-ink-soft">
        <section>
          <h2 className="text-[18px] font-semibold text-ink">Using this app</h2>
          <p className="mt-2">
            This app lets you book, reschedule, and cancel physiotherapy appointments with the
            clinic. By signing in and booking, you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">Appointments</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Sessions are 45 minutes, bookable between 08:00 and 17:00 clinic time.</li>
            <li>
              You can reschedule or cancel an upcoming appointment yourself from{" "}
              <span className="text-ink">My appointments</span> at any time before it starts.
            </li>
            <li>
              The clinic may also reschedule, cancel, or mark an appointment completed or
              no-show, and will notify you by email when it does.
            </li>
            <li>Please arrive on time — a late arrival may shorten your session.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">Your account</h2>
          <p className="mt-2">
            You sign in with your Google account. You&rsquo;re responsible for keeping your
            contact details (phone number) accurate, since the clinic uses them to reach you
            about your appointments.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">What we don&rsquo;t guarantee</h2>
          <p className="mt-2">
            This app is a booking tool, not a substitute for professional medical advice. It
            doesn&rsquo;t guarantee a specific physiotherapist&rsquo;s availability beyond what
            the booking screen shows at the time you book, and calendar or email notifications
            can occasionally be delayed or fail to send — your appointment record in{" "}
            <span className="text-ink">My appointments</span> is always the source of truth.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">Changes</h2>
          <p className="mt-2">
            We may update these terms as the app changes. Continuing to use the app after an
            update means you accept the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">Contact</h2>
          <p className="mt-2">
            Questions about these terms can be sent to the clinic&rsquo;s reception email
            address. See also our{" "}
            <a href="/privacy" className="text-azure-hover underline">
              Privacy Policy
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
