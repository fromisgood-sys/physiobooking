export default function AppointmentsLoading() {
  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <div className="h-8 w-56 rounded-btn bg-paper-sunk" />

      <div className="mt-8 flex gap-2 border-b border-line pb-3">
        <div className="h-6 w-20 rounded-btn bg-paper-sunk" />
        <div className="h-6 w-16 rounded-btn bg-paper-sunk" />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-card border border-line bg-paper-tint" />
        ))}
      </div>
    </main>
  );
}
