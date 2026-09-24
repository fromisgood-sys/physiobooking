"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/physiotherapists", label: "Physiotherapists" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/audit", label: "Audit" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Admin sections">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-10 items-center rounded-full px-5 text-[15px] font-medium transition-colors duration-150 ease-out ${
              active
                ? "bg-azure text-white"
                : "bg-paper-tint text-ink-soft hover:bg-azure-soft hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
