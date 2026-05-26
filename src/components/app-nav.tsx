"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, ListChecks, LogOut, MoreHorizontal, NotebookText, ReceiptText, Settings, ShoppingCart, Utensils, X } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: CalendarDays },
  { href: "/money", label: "Money", icon: ReceiptText },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/groceries", label: "Groceries", icon: ShoppingCart },
  { href: "/home", label: "Home", icon: Home },
  { href: "/notes", label: "Notes", icon: NotebookText },
  { href: "/settings", label: "Settings", icon: Settings }
];

const mobileItems = [
  { href: "/dashboard", label: "Home", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/groceries", label: "Groceries", icon: ShoppingCart },
  { href: "/money", label: "Money", icon: ReceiptText }
];

const overflowItems = [
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/home", label: "Home records", icon: Home },
  { href: "/notes", label: "Notes", icon: NotebookText },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "flex items-center gap-3 rounded-md bg-paper px-3 py-2 text-sm font-semibold text-ink"
                : "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink/75 hover:bg-paper hover:text-ink"
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileBottomNav({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const overflowActive = overflowItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(23,32,27,0.08)] backdrop-blur md:hidden">
      {open ? (
        <div className="mb-2 rounded-lg border border-line bg-white p-2 shadow-lg">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase text-ink/50">More</p>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-ink" aria-label="Close more menu">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {overflowItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={
                    active
                      ? "flex items-center gap-2 rounded-md bg-paper px-3 py-3 text-sm font-semibold text-ink"
                      : "flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-ink/70 hover:bg-paper hover:text-ink"
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <form action={signOutAction}>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-ink/70 hover:bg-paper hover:text-coral">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-5 gap-1">
        {mobileItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex flex-col items-center gap-1 rounded-md bg-paper px-2 py-2 text-xs font-semibold text-ink"
                  : "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-ink/60 hover:bg-paper hover:text-ink"
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={
            open || overflowActive
              ? "flex flex-col items-center gap-1 rounded-md bg-paper px-2 py-2 text-xs font-semibold text-ink"
              : "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-ink/60 hover:bg-paper hover:text-ink"
          }
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="max-w-full truncate">More</span>
        </button>
      </div>
    </nav>
  );
}
