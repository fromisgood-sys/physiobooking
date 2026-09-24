export interface StatTileProps {
  label: string;
  value: number;
}

// Lime is reserved for the booking summary bar (DESIGN.md: at most one lime
// element per viewport, and never as text on a light ground) — admin tiles
// stay azure.
export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-card border border-line bg-paper-tint p-6">
      <p className="text-[56px] font-bold leading-[56px] tracking-[-0.02em] tabular-nums text-azure">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {label}
      </p>
    </div>
  );
}
