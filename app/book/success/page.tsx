import Link from "next/link";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
        Booking reference
      </p>
      <p className="mt-1 text-[32px] font-bold leading-[38px] tracking-[-0.025em] text-ink">
        {ref ?? "—"}
      </p>
      <p className="mt-4 max-w-sm text-[15px] leading-6 text-ink-soft">
        Your appointment is confirmed. You&rsquo;ll get a confirmation email shortly.
      </p>
      <Link
        href="/appointments"
        className="mt-8 flex h-11 items-center justify-center rounded-btn bg-azure px-6 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover"
      >
        View my appointments
      </Link>
    </main>
  );
}
