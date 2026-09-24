export default function BookPhysioLoading() {
  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <div className="h-4 w-32 rounded-btn bg-paper-sunk" />
      <div className="mt-6 flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-[16px] bg-paper-sunk" />
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-btn bg-paper-sunk" />
          <div className="h-4 w-32 rounded-btn bg-paper-sunk" />
        </div>
      </div>

      <div className="mt-10 flex gap-2 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-[60px] w-14 shrink-0 rounded-btn bg-paper-sunk" />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-11 rounded-btn bg-paper-sunk" />
        ))}
      </div>
    </main>
  );
}
