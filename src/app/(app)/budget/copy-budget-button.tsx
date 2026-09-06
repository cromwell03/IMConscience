"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyBudgetToMonth } from "@/lib/actions/budget-actions";
import { Copy } from "lucide-react";

export function CopyBudgetButton({ fromMonth, toMonth }: { fromMonth: string; toMonth: string }) {
  const router = useRouter();

  async function handleClick() {
    try {
      await copyBudgetToMonth(fromMonth, toMonth);
      toast.success(`Copied budget from ${fromMonth}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to copy budget");
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick}>
      <Copy className="h-4 w-4" /> Copy from {fromMonth}
    </Button>
  );
}
