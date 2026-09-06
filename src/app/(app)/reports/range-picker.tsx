"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DATE_RANGE_PRESETS } from "./date-range";

export function RangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preset = searchParams.get("range") ?? "this-month";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={(v) => setParam("range", v)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <>
          <Input type="date" defaultValue={searchParams.get("from") ?? ""} onChange={(e) => setParam("from", e.target.value)} className="w-36" />
          <Input type="date" defaultValue={searchParams.get("to") ?? ""} onChange={(e) => setParam("to", e.target.value)} className="w-36" />
        </>
      )}
    </div>
  );
}
