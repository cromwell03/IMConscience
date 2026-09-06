"use client";

import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { setBudget } from "@/lib/actions/budget-actions";

export function BudgetAmountInput({ month, categoryId, defaultValue }: { month: string; categoryId: string; defaultValue: string }) {
  const [value, setValue] = React.useState(defaultValue);
  const [saving, setSaving] = React.useState(false);

  async function commit() {
    if (value === defaultValue) return;
    setSaving(true);
    const fd = new FormData();
    fd.set("month", month);
    fd.set("categoryId", categoryId);
    fd.set("amount", value || "0");
    try {
      await setBudget(fd);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save budget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Input
      className="h-8 w-28 text-right"
      inputMode="decimal"
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
    />
  );
}
