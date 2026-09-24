import type { ReactNode } from "react";

export function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-block border border-line bg-paper shadow-[var(--shadow-float)]">
      <div className="flex items-center gap-1.5 border-b border-line bg-paper-tint px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}
