"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth-actions";

export function MobileNav({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground font-bold text-xs">
            ₱
          </div>
          <span className="text-sm font-semibold">Finance OS</span>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md p-2 hover:bg-surface-muted">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative flex w-64 flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-semibold text-white">{userName}</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-sidebar-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                      active ? "bg-sidebar-active text-white" : "text-sidebar-foreground hover:bg-sidebar-active/60"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <form action={logoutAction} className="border-t border-white/10 px-3 py-3">
              <button type="submit" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-active/60">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
