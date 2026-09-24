import type { LucideIcon } from "lucide-react";

export interface StatTileProps {
  label: string;
  value: number;
  icon?: LucideIcon;
}

// Lime is reserved for the booking summary bar (DESIGN.md: at most one lime
// element per viewport, and never as text on a light ground) — admin tiles
// stay azure.
export function StatTile({ label, value, icon: Icon }: StatTileProps) {
  return (
    <div className="rounded-card border border-line bg-paper-tint p-6">
      {Icon && (
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-btn bg-azure-soft">
          <Icon className="h-5 w-5 text-azure-hover" strokeWidth={2} aria-hidden="true" />
        </div>
      )}
      <p className="text-[56px] font-bold leading-[56px] tracking-[-0.02em] tabular-nums text-azure">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {label}
      </p>
    </div>
  );
}
