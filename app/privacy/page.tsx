export const metadata = {
  title: "Privacy Policy — Physio Booking",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-6 py-16">
      <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        Privacy Policy
      </h1>
      <p className="mt-2 text-[15px] text-ink-muted">Last updated 24 September 2026</p>

      <div className="mt-10 flex flex-col gap-8 text-[15px] leading-6 text-ink-soft">
        <section>
          <h2 className="text-[18px] font-semibold text-ink">What this app does</h2>
          <p className="mt-2">
            This app lets patients book physiotherapy appointments and lets clinic staff manage
            those bookings. This page explains what information it collects and why.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">Information we collect</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Google account information.</strong> When you sign in
              with Google, we receive your name, email address, and profile picture.
            </li>
            <li>
              <strong className="text-ink">Google Calendar access.</strong> If you grant calendar
              permission, we create, update, and delete a single calendar event per appointment on
              your own Google Calendar. We do not read your existing calendar events. Declining
              this permission does not stop you from booking — the calendar step is simply
              skipped.
            </li>
            <li>
              <strong className="text-ink">Booking details.</strong> Phone number, reason for
              visit, and appointment history, so the clinic can provide the service and keep
              accurate records.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">How we use it</h2>
          <p className="mt-2">
            To create your account, show you available appointment times, confirm and manage your
            bookings, send you email confirmations, and create the matching calendar event.
            Clinic staff (receptionists/admins) can see appointment details in order to run the
            clinic's schedule. We do not sell your information or use it for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">Email notifications</h2>
          <p className="mt-2">
            Booking confirmations, reschedules, and cancellations are sent by email to you and to
            the clinic's reception inbox via a third-party form-to-email service (Formspree).
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">Data retention</h2>
          <p className="mt-2">
            Cancelled appointments are kept as history, not deleted, so both you and the clinic
            have an accurate record. Your Google Calendar tokens are stored only to maintain your
            calendar events and are never shared with anyone besides the clinic's systems.
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-semibold text-ink">Contact</h2>
          <p className="mt-2">
            Questions about your data can be sent to the clinic's reception email address.
          </p>
        </section>
      </div>
    </main>
  );
}
