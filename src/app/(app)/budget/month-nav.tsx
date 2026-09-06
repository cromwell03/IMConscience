"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthNav({ month, label }: { month: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function go(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`${pathname}?month=${next}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="icon" variant="outline" onClick={() => go(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="w-32 text-center text-sm font-medium">{label}</span>
      <Button size="icon" variant="outline" onClick={() => go(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
