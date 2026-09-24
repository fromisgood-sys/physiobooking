export default function BookLoading() {
  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-16">
      <div className="h-9 w-64 rounded-btn bg-paper-sunk" />
      <div className="mt-3 h-5 w-80 rounded-btn bg-paper-sunk" />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex h-56 flex-col gap-4 rounded-card border border-line bg-paper p-6"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 rounded-[16px] bg-paper-sunk" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-paper-sunk" />
                <div className="h-3 w-20 rounded bg-paper-sunk" />
              </div>
            </div>
            <div className="h-4 w-full rounded bg-paper-sunk" />
            <div className="mt-auto h-11 rounded-btn bg-paper-sunk" />
          </div>
        ))}
      </div>
    </main>
  );
}
