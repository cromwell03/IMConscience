"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/categories", label: "Categories" },
  { href: "/settings/institutions", label: "Institutions" },
  { href: "/settings/currencies", label: "Currencies" },
  { href: "/settings/rules", label: "Categorization Rules" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px",
              active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
