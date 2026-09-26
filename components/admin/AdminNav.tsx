"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Activity, CalendarDays, ClipboardList, FileBarChart2, FileText, LayoutDashboard, Settings2, UserCog, Users, UserRound, Clock3 } from "lucide-react";

export const ADMIN_NAVIGATION = [
  { href: "/admin", label: "Home", icon: LayoutDashboard, section: "MAIN", exact: true, available: true },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays, section: "MAIN", exact: false, available: true },
  { href: "/admin/physiotherapists", label: "Physiotherapists", icon: Users, section: "MAIN", exact: false, available: true },
  { href: "/admin/availability", label: "Availability", icon: Activity, section: "MAIN", exact: false, available: true },
  { href: "/admin/time-off", label: "Time Off", icon: Clock3, section: "MAIN", exact: false, available: true },
  { href: "/admin/patients", label: "Patients", icon: UserRound, section: "MAIN", exact: false, available: true },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart2, section: "MAIN", exact: false, available: true },
  { href: "/admin/audit", label: "Audit Log", icon: ClipboardList, section: "MAIN", exact: false, available: true },
  { href: "/admin/settings", label: "Clinic Settings", icon: Settings2, section: "MANAGEMENT", exact: false, available: true },
  { href: "/admin/users", label: "Users", icon: UserCog, section: "MANAGEMENT", exact: false, available: false },
  { href: "/admin/email-templates", label: "Email Templates", icon: FileText, section: "MANAGEMENT", exact: false, available: false },
] as const;

export function AdminNav({ variant = "sidebar" }: { variant?: "sidebar" | "drawer" }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className={variant === "sidebar" ? "flex flex-col gap-1.5" : "flex flex-col gap-1"}>
      {["MAIN", "MANAGEMENT"].map((section) => <div key={section} className="contents">
      <p className={`${section === "MAIN" ? "mt-0" : "mt-5"} px-3 pb-1 text-[9px] font-semibold tracking-[0.08em] text-[#81939e]`}>{section}</p>
      {ADMIN_NAVIGATION.filter((item) => item.section === section).map(({ href, label, icon: Icon, exact, available }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const className = variant === "sidebar"
          ? `flex min-h-10 items-center gap-3 rounded-[8px] px-3 text-[12px] font-medium transition-colors ${active ? "bg-[#e5f4f2] text-[#107f7b]" : "text-[#4c6273] hover:bg-[#f4f8f9] hover:text-[#19384e]"}`
          : `flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-[14px] font-medium transition-colors ${active ? "bg-[#e5f4f2] text-[#107f7b]" : "text-[#4c6273] hover:bg-[#f4f8f9] hover:text-[#19384e]"}`;
        const content = <><Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#138b86]" : "text-[#718596]"}`} aria-hidden="true" />{label}</>;
        return available ? (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={variant === "sidebar"
            ? className : className}>{content}</Link>
        ) : <span key={href} aria-disabled="true" className={`${className} cursor-default opacity-80`}>{content}</span>;
      })}
      </div>)}
    </nav>
  );
}
