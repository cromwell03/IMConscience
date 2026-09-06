import "server-only";

/**
 * Rough payoff estimate for a revolving balance paying a fixed amount each
 * month, using the standard amortization formula. Returns null when there's
 * not enough information to give a meaningful answer (no rate, no payment,
 * or the payment doesn't even cover monthly interest) — we intentionally
 * show "insufficient data" in the UI rather than guess.
 */
export function estimatePayoffMonths(balanceMinor: bigint, aprBps: number | null, minimumPaymentMinor: bigint | null): number | null {
  if (balanceMinor <= 0n) return 0;
  if (!aprBps || !minimumPaymentMinor || minimumPaymentMinor <= 0n) return null;

  const monthlyRate = aprBps / 10000 / 12;
  const balance = Number(balanceMinor);
  const payment = Number(minimumPaymentMinor);

  if (monthlyRate <= 0) {
    return Math.ceil(balance / payment);
  }

  const monthlyInterest = balance * monthlyRate;
  if (payment <= monthlyInterest) return null; // payment never reduces principal

  const months = Math.log(payment / (payment - balance * monthlyRate)) / Math.log(1 + monthlyRate);
  if (!Number.isFinite(months) || months <= 0) return null;
  return Math.ceil(months);
}
