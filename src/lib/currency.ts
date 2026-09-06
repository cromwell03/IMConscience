import "server-only";
import { prisma } from "@/lib/prisma";

const MICRO = 1_000_000n;

/** Rate to convert 1 unit of `currencyCode` into the base currency, scaled by 1e6. Returns 1e6 (i.e. rate=1) for the base currency itself or when no rate is on file — callers treat that as "assume parity" rather than failing the whole calculation. */
export async function getRateMicros(currencyCode: string, baseCurrency: string, asOf?: Date): Promise<bigint> {
  if (currencyCode === baseCurrency) return MICRO;

  const rate = asOf
    ? await prisma.exchangeRate.findFirst({
        where: { currencyCode, asOfDate: { lte: asOf } },
        orderBy: { asOfDate: "desc" },
      })
    : await prisma.exchangeRate.findFirst({
        where: { currencyCode },
        orderBy: { asOfDate: "desc" },
      });

  if (rate) return rate.rateMicros;

  // Fall back to the most recent rate on file regardless of date, if any.
  const any = await prisma.exchangeRate.findFirst({
    where: { currencyCode },
    orderBy: { asOfDate: "desc" },
  });
  return any ? any.rateMicros : MICRO;
}

/** Converts an amount from `currencyCode` into the base currency's minor units. */
export async function convertToBase(
  amountMinor: bigint,
  currencyCode: string,
  baseCurrency: string,
  asOf?: Date
): Promise<bigint> {
  if (currencyCode === baseCurrency) return amountMinor;
  const rateMicros = await getRateMicros(currencyCode, baseCurrency, asOf);
  return (amountMinor * rateMicros) / MICRO;
}

export async function getUserBaseCurrency(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { baseCurrency: true } });
  return user.baseCurrency;
}
