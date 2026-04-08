"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students" },
  { href: "/tutors", label: "Tutors" },
  { href: "/resources", label: "Resources" },
  { href: "/invoices", label: "Invoices" },
  { href: "/revenue", label: "Revenue" },
  { href: "/log-session", label: "Log Session" },
];

const TUTOR_LINKS = [
  { href: "/tutor", label: "Home" },
  { href: "/students", label: "My Students" },
  { href: "/resources", label: "Resources" },
  { href: "/log-session", label: "Log Session" },
];

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? ADMIN_LINKS : TUTOR_LINKS;

  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const active = pathname === l.href || (l.href !== "/dashboard" && l.href !== "/tutor" && pathname.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              active
                ? "bg-[#334155] text-[#F8FAFC]"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
