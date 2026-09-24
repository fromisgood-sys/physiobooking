import Link from "next/link";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/physiotherapists", label: "Physiotherapists" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/audit", label: "Audit" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-carbon-line bg-carbon">
        <nav className="mx-auto flex w-full max-w-[1120px] items-center gap-6 px-6 py-4">
          <span className="text-[15px] font-semibold text-white">Admin</span>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-white/70 transition-colors duration-150 ease-out hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
