// All money math happens on BigInt minor units (e.g. centavos). Never convert
// to Number for arithmetic — only for the final, rounded display string.

export const CURRENCY_MINOR_UNITS: Record<string, number> = {
  PHP: 2,
  USD: 2,
  EUR: 2,
  JPY: 0,
  GBP: 2,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PHP: "₱",
  USD: "$",
  EUR: "€",
  JPY: "¥",
  GBP: "£",
};

function minorUnits(currencyCode: string): number {
  return CURRENCY_MINOR_UNITS[currencyCode] ?? 2;
}

/** Parse a user-typed major-unit string (e.g. "1,234.56") into minor units (BigInt). */
export function toMinorUnits(input: string | number, currencyCode = "PHP"): bigint {
  const digits = minorUnits(currencyCode);
  const scale = 10 ** digits;
  const cleaned = typeof input === "number" ? input.toString() : input.replace(/,/g, "").trim();
  if (cleaned === "" || Number.isNaN(Number(cleaned))) {
    throw new Error(`Invalid amount: "${input}"`);
  }
  const negative = cleaned.startsWith("-");
  const abs = negative ? cleaned.slice(1) : cleaned;
  const [wholeRaw, fracRaw = ""] = abs.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const frac = (fracRaw + "0".repeat(digits)).slice(0, digits);
  const minor = BigInt(whole) * BigInt(scale) + BigInt(frac === "" ? "0" : frac);
  return negative ? -minor : minor;
}

/** Format minor units as a display string with thousands separators, no currency symbol. */
export function formatMinorUnits(amountMinor: bigint | number, currencyCode = "PHP"): string {
  const digits = minorUnits(currencyCode);
  const scale = 10n ** BigInt(digits);
  const amount = typeof amountMinor === "number" ? BigInt(Math.round(amountMinor)) : amountMinor;
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const whole = abs / scale;
  const frac = abs % scale;
  const wholeStr = whole.toLocaleString("en-US");
  const fracStr = digits > 0 ? "." + frac.toString().padStart(digits, "0") : "";
  return `${negative ? "-" : ""}${wholeStr}${fracStr}`;
}

/** Format minor units with a leading currency symbol, e.g. "₱1,234.56". */
export function formatCurrency(amountMinor: bigint | number, currencyCode = "PHP"): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode + " ";
  const amount = typeof amountMinor === "number" ? BigInt(Math.round(amountMinor)) : amountMinor;
  const negative = amount < 0n;
  const formatted = formatMinorUnits(negative ? -amount : amount, currencyCode);
  return `${negative ? "-" : ""}${symbol}${formatted}`;
}

/** Convert minor units to a plain JS number of major units — for charts/inputs only, never for storage or accumulation. */
export function minorToNumber(amountMinor: bigint | number, currencyCode = "PHP"): number {
  const digits = minorUnits(currencyCode);
  const amount = typeof amountMinor === "number" ? amountMinor : Number(amountMinor);
  return amount / 10 ** digits;
}

/** Multiply a decimal quantity string (e.g. "10.5" shares, "0.00234" BTC) by a per-unit price in minor units, returning a whole-number minor-unit total. Uses fixed-point integer math at `precision` decimal places — never floats. */
export function multiplyQuantityByPriceMinor(quantity: string, priceMinor: bigint, precision = 8): bigint {
  const cleaned = quantity.replace(/,/g, "").trim();
  const negative = cleaned.startsWith("-");
  const abs = negative ? cleaned.slice(1) : cleaned;
  const [wholeRaw, fracRaw = ""] = abs.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const frac = (fracRaw + "0".repeat(precision)).slice(0, precision);
  const scaledQty = BigInt(whole) * 10n ** BigInt(precision) + BigInt(frac === "" ? "0" : frac);
  const product = scaledQty * priceMinor;
  const result = product / 10n ** BigInt(precision);
  return negative ? -result : result;
}

export function sumMinor(values: (bigint | null | undefined)[]): bigint {
  return values.reduce<bigint>((acc, v) => acc + (v ?? 0n), 0n);
}

/** Safe percentage: (numerator / denominator) * 100, returns null when denominator is zero. */
export function percentOf(numeratorMinor: bigint, denominatorMinor: bigint): number | null {
  if (denominatorMinor === 0n) return null;
  // scale by 10000 for 2 decimal places of precision before converting to Number
  const scaled = (numeratorMinor * 10000n) / denominatorMinor;
  return Number(scaled) / 100;
}

/** Convert an amount in `fromCurrency` into `toCurrency` minor units using a rateMicros (rate to base, scaled by 1e6). */
export function convertMinor(
  amountMinor: bigint,
  fromRateMicros: bigint,
  toRateMicros: bigint
): bigint {
  if (fromRateMicros === toRateMicros) return amountMinor;
  // amount_in_base = amountMinor * fromRateMicros / 1e6
  // amount_in_to   = amount_in_base * 1e6 / toRateMicros
  return (amountMinor * fromRateMicros) / toRateMicros;
}
