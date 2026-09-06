import { formatCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Money({
  amountMinor,
  currencyCode = "PHP",
  className,
  signed = false,
  colorize = false,
}: {
  amountMinor: bigint | number;
  currencyCode?: string;
  className?: string;
  signed?: boolean;
  colorize?: boolean;
}) {
  const amount = typeof amountMinor === "number" ? BigInt(Math.round(amountMinor)) : amountMinor;
  const formatted = formatCurrency(amount, currencyCode);
  const withSign = signed && amount > 0n ? `+${formatted}` : formatted;
  const colorClass = colorize ? (amount > 0n ? "text-positive" : amount < 0n ? "text-negative" : "text-foreground") : "";
  return <span className={cn("tabular-nums", colorClass, className)}>{withSign}</span>;
}
