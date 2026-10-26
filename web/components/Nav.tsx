"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleDollarSign, LayoutDashboard, ShieldAlert } from "lucide-react";

const items = [
  { href: "/", label: "Control room", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/health", label: "Data health", icon: ShieldAlert },
  { href: "/finance", label: "Finance", icon: CircleDollarSign },
];

export function Nav({ alerts }: { alerts: number }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-rule bg-console/95 backdrop-blur md:inset-y-0 md:left-0 md:right-auto md:w-24 md:flex-col md:border-r md:border-t-0 md:pt-20"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-1 px-1 py-3 text-[11px] font-medium transition-colors md:flex-none md:py-4 ${
              active ? "text-ink" : "text-faint hover:text-dim"
            }`}
          >
            {active ? <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-signal md:inset-x-auto md:inset-y-3 md:left-0 md:h-auto md:w-0.5" /> : null}
            <span className="relative">
              <Icon size={22} strokeWidth={1.75} />
              {href === "/health" && alerts > 0 ? (
                <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-tally px-1 text-[10px] font-semibold text-white">
                  {alerts}
                </span>
              ) : null}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
