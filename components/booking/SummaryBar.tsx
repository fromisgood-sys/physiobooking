"use client";

import Link from "next/link";
import { SESSION_MINUTES } from "@/lib/tz";

export interface SummaryBarProps {
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm" clinic-local */
  time: string;
  href: string;
}

export function SummaryBar({ date, time, href }: SummaryBarProps) {
  const [y, m, d] = date.split("-").map(Number);
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-lime-soft">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-6 py-4">
        <p className="text-[15px] font-medium tabular-nums text-ink">
          {dateLabel} &middot; {time} &middot; {SESSION_MINUTES} min
        </p>
        <Link
          href={href}
          className="flex h-11 shrink-0 items-center justify-center rounded-btn bg-azure px-6 text-[15px] font-medium text-white transition-colors duration-150 ease-out hover:bg-azure-hover"
        >
          Confirm booking
        </Link>
      </div>
    </div>
  );
}
