"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from "@/lib/types";

const ALL = "__all__";

export function FilterBar({
  accounts,
  categories,
}: {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search description or merchant…"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => setParam("q", e.target.value)}
        className="w-56"
      />
      <Select defaultValue={searchParams.get("accountId") ?? ALL} onValueChange={(v) => setParam("accountId", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select defaultValue={searchParams.get("categoryId") ?? ALL} onValueChange={(v) => setParam("categoryId", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          <SelectItem value="uncategorized">Uncategorized</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select defaultValue={searchParams.get("type") ?? ALL} onValueChange={(v) => setParam("type", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {TRANSACTION_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {TRANSACTION_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input type="date" defaultValue={searchParams.get("from") ?? ""} onChange={(e) => setParam("from", e.target.value)} className="w-36" />
      <span className="text-xs text-muted">to</span>
      <Input type="date" defaultValue={searchParams.get("to") ?? ""} onChange={(e) => setParam("to", e.target.value)} className="w-36" />
    </div>
  );
}
