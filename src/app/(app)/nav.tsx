"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/portals", label: "Portals" },
  { href: "/documents", label: "Compliance docs" },
  { href: "/invoices", label: "Invoices" },
  { href: "/payments", label: "Payments" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ compact = false }: { compact?: boolean }) {
  const path = usePathname();
  if (compact) {
    return (
      <nav className="flex gap-3 overflow-x-auto text-sm">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={path.startsWith(i.href) ? "font-semibold text-indigo-600" : "text-gray-600"}>
            {i.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {ITEMS.map((i) => {
        const active = path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`rounded-md px-2.5 py-2 text-sm ${active ? "bg-indigo-50 font-medium text-indigo-700" : "text-gray-700 hover:bg-gray-50"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
