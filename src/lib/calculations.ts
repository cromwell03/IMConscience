import "server-only";
import { startOfMonth, endOfMonth, subMonths, format, addDays, isBefore, isAfter, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { convertToBase } from "@/lib/currency";
import { multiplyQuantityByPriceMinor, percentOf, sumMinor } from "@/lib/money";
import {
  LIABILITY_ACCOUNT_TYPES,
  LIQUID_ACCOUNT_TYPES,
  INCOME_EFFECT_TYPES,
  EXPENSE_EFFECT_TYPES,
  type AccountType,
} from "@/lib/types";

export function monthRange(reference: Date = new Date()) {
  return { start: startOfMonth(reference), end: endOfMonth(reference) };
}

/** Market-valued balance of an account: for investment accounts with holdings, the sum of quantity*currentPrice; otherwise the ledger-derived currentBalanceMinor (cost basis / cash balance). Documented distinction: currentBalanceMinor always reflects contributed cash per the transaction ledger, while this reflects what the account is worth today. */
export async function getAccountValuationMinor(account: {
  id: string;
  type: string;
  currentBalanceMinor: bigint;
}): Promise<bigint> {
  if (account.type !== "INVESTMENT") return account.currentBalanceMinor;
  const holdings = await prisma.holding.findMany({ where: { accountId: account.id } });
  if (holdings.length === 0) return account.currentBalanceMinor;
  return sumMinor(
    holdings.map((h) => {
      const price = h.currentPriceMinor ?? h.averageCostMinor;
      return multiplyQuantityByPriceMinor(h.quantity, price);
    })
  );
}

export interface NetWorthBreakdown {
  netWorthMinor: bigint;
  totalAssetsMinor: bigint;
  totalLiabilitiesMinor: bigint;
  liquidAssetsMinor: bigint;
  investmentsMinor: bigint;
  otherAssetsMinor: bigint;
  totalDebtMinor: bigint;
  baseCurrency: string;
}

export async function getNetWorth(userId: string): Promise<NetWorthBreakdown> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const baseCurrency = user.baseCurrency;

  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true, includeInNetWorth: true },
  });

  let liquidAssetsMinor = 0n;
  let investmentsMinor = 0n;
  let totalLiabilitiesMinor = 0n;
  let otherAccountAssetsMinor = 0n;

  for (const account of accounts) {
    const valuation = await getAccountValuationMinor(account);
    const inBase = await convertToBase(valuation, account.currencyCode, baseCurrency);
    const type = account.type as AccountType;

    if (LIABILITY_ACCOUNT_TYPES.includes(type)) {
      totalLiabilitiesMinor += inBase;
    } else if (LIQUID_ACCOUNT_TYPES.includes(type)) {
      liquidAssetsMinor += inBase;
    } else if (type === "INVESTMENT") {
      investmentsMinor += inBase;
    } else {
      otherAccountAssetsMinor += inBase;
    }
  }

  const assets = await prisma.asset.findMany({ where: { userId, includeInNetWorth: true } });
  let otherAssetsMinor = otherAccountAssetsMinor;
  for (const asset of assets) {
    otherAssetsMinor += await convertToBase(asset.currentValueMinor, asset.currencyCode, baseCurrency);
  }

  const totalAssetsMinor = liquidAssetsMinor + investmentsMinor + otherAssetsMinor;
  const netWorthMinor = totalAssetsMinor - totalLiabilitiesMinor;

  return {
    netWorthMinor,
    totalAssetsMinor,
    totalLiabilitiesMinor,
    liquidAssetsMinor,
    investmentsMinor,
    otherAssetsMinor,
    totalDebtMinor: totalLiabilitiesMinor,
    baseCurrency,
  };
}

export interface IncomeExpenseSummary {
  incomeMinor: bigint;
  expensesMinor: bigint;
  netCashFlowMinor: bigint;
  savingsRatePercent: number | null;
  baseCurrency: string;
}

export async function getIncomeExpenseSummary(
  userId: string,
  start: Date,
  end: Date
): Promise<IncomeExpenseSummary> {
  const baseCurrency = await prisma.user
    .findUniqueOrThrow({ where: { id: userId }, select: { baseCurrency: true } })
    .then((u) => u.baseCurrency);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      date: { gte: start, lte: end },
      type: { in: [...INCOME_EFFECT_TYPES, ...EXPENSE_EFFECT_TYPES] },
    },
    select: { type: true, amountMinor: true, currencyCode: true, date: true },
  });

  let incomeMinor = 0n;
  let expensesMinor = 0n;

  for (const tx of transactions) {
    const inBase = await convertToBase(tx.amountMinor, tx.currencyCode, baseCurrency, tx.date);
    if ((INCOME_EFFECT_TYPES as string[]).includes(tx.type)) {
      incomeMinor += inBase;
    } else {
      expensesMinor += inBase;
    }
  }

  const netCashFlowMinor = incomeMinor - expensesMinor;
  const savingsRatePercent = percentOf(netCashFlowMinor, incomeMinor);

  return { incomeMinor, expensesMinor, netCashFlowMinor, savingsRatePercent, baseCurrency };
}

export interface MonthlyTrendPoint {
  month: string; // "YYYY-MM"
  label: string; // "Jan 2026"
  incomeMinor: bigint;
  expensesMinor: bigint;
}

export async function getIncomeExpenseTrend(userId: string, months = 12): Promise<MonthlyTrendPoint[]> {
  const points: MonthlyTrendPoint[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const reference = subMonths(now, i);
    const { start, end } = monthRange(reference);
    const summary = await getIncomeExpenseSummary(userId, start, end);
    points.push({
      month: format(reference, "yyyy-MM"),
      label: format(reference, "MMM yyyy"),
      incomeMinor: summary.incomeMinor,
      expensesMinor: summary.expensesMinor,
    });
  }
  return points;
}

export interface CategorySpend {
  categoryId: string | null;
  categoryName: string;
  amountMinor: bigint;
}

export async function getSpendingByCategory(userId: string, start: Date, end: Date): Promise<CategorySpend[]> {
  const baseCurrency = await prisma.user
    .findUniqueOrThrow({ where: { id: userId }, select: { baseCurrency: true } })
    .then((u) => u.baseCurrency);

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end } },
    include: { category: true, splits: { include: { category: true } } },
  });

  const byCategory = new Map<string, { name: string; amount: bigint }>();

  for (const tx of transactions) {
    const inBaseFull = await convertToBase(tx.amountMinor, tx.currencyCode, baseCurrency, tx.date);
    if (tx.isSplit && tx.splits.length > 0) {
      for (const split of tx.splits) {
        const key = split.categoryId ?? "uncategorized";
        const name = split.category?.name ?? "Uncategorized";
        const inBase = await convertToBase(split.amountMinor, tx.currencyCode, baseCurrency, tx.date);
        const existing = byCategory.get(key);
        byCategory.set(key, { name, amount: (existing?.amount ?? 0n) + inBase });
      }
    } else {
      const key = tx.categoryId ?? "uncategorized";
      const name = tx.category?.name ?? "Uncategorized";
      const existing = byCategory.get(key);
      byCategory.set(key, { name, amount: (existing?.amount ?? 0n) + inBaseFull });
    }
  }

  return Array.from(byCategory.entries())
    .map(([categoryId, v]) => ({
      categoryId: categoryId === "uncategorized" ? null : categoryId,
      categoryName: v.name,
      amountMinor: v.amount,
    }))
    .sort((a, b) => (b.amountMinor > a.amountMinor ? 1 : -1));
}

export interface AttentionItem {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  href?: string;
}

export async function getAttentionNeeded(userId: string): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];
  const now = new Date();

  const [bills, accounts, uncategorizedCount, budgets] = await Promise.all([
    prisma.bill.findMany({ where: { userId, isActive: true } }),
    prisma.account.findMany({ where: { userId, isActive: true } }),
    prisma.transaction.count({
      where: { userId, deletedAt: null, type: { in: ["EXPENSE", "INCOME"] }, categoryId: null, isSplit: false },
    }),
    prisma.budget.findMany({ where: { userId, month: format(now, "yyyy-MM") }, include: { category: true } }),
  ]);

  for (const bill of bills) {
    const daysUntil = Math.ceil((bill.nextDueDate.getTime() - now.getTime()) / 86400000);
    if (daysUntil < 0) {
      items.push({
        id: `bill-overdue-${bill.id}`,
        severity: "high",
        title: `${bill.name} is overdue`,
        description: `Was due ${format(bill.nextDueDate, "MMM d, yyyy")}`,
        href: "/bills",
      });
    } else if (daysUntil <= bill.reminderDaysBefore) {
      items.push({
        id: `bill-soon-${bill.id}`,
        severity: "medium",
        title: `${bill.name} due soon`,
        description: `Due ${format(bill.nextDueDate, "MMM d, yyyy")} (${daysUntil} day${daysUntil === 1 ? "" : "s"})`,
        href: "/bills",
      });
    }
  }

  for (const account of accounts) {
    if (account.type === "CREDIT_CARD" && account.creditLimitMinor && account.creditLimitMinor > 0n) {
      const utilization = percentOf(account.currentBalanceMinor, account.creditLimitMinor);
      if (utilization !== null && utilization >= 70) {
        items.push({
          id: `cc-util-${account.id}`,
          severity: utilization >= 90 ? "high" : "medium",
          title: `${account.name} balance is high`,
          description: `Using ${utilization.toFixed(0)}% of its credit limit`,
          href: "/debt",
        });
      }
    }
    if (
      account.isActive &&
      account.lastReconciledAt &&
      isBefore(account.lastReconciledAt, subMonths(now, 2))
    ) {
      items.push({
        id: `recon-${account.id}`,
        severity: "low",
        title: `${account.name} needs reconciliation`,
        description: `Last reconciled ${format(account.lastReconciledAt, "MMM d, yyyy")}`,
        href: "/accounts",
      });
    }
  }

  if (uncategorizedCount > 0) {
    items.push({
      id: "uncategorized",
      severity: "low",
      title: `${uncategorizedCount} uncategorized transaction${uncategorizedCount === 1 ? "" : "s"}`,
      description: "Categorize these to keep your reports accurate",
      href: "/transactions?uncategorized=1",
    });
  }

  for (const budget of budgets) {
    const { start, end } = monthRange(now);
    const spentTx = await prisma.transaction.aggregate({
      where: { userId, deletedAt: null, type: "EXPENSE", categoryId: budget.categoryId, date: { gte: start, lte: end } },
      _sum: { amountMinor: true },
    });
    const spent = spentTx._sum.amountMinor ?? 0n;
    const pct = percentOf(spent, budget.amountMinor);
    if (pct !== null && pct >= 100) {
      items.push({
        id: `budget-over-${budget.id}`,
        severity: "high",
        title: `${budget.category.name} budget exceeded`,
        description: `Spent ${pct.toFixed(0)}% of budget this month`,
        href: "/budget",
      });
    } else if (pct !== null && pct >= 85) {
      items.push({
        id: `budget-warn-${budget.id}`,
        severity: "medium",
        title: `${budget.category.name} budget needs attention`,
        description: `Spent ${pct.toFixed(0)}% of budget this month`,
        href: "/budget",
      });
    }
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/** Records (or updates) today's net worth snapshot. Cheap and idempotent — safe to call on every dashboard/net-worth page load so history accumulates automatically without a separate cron job. */
export async function recordTodaysNetWorthSnapshot(userId: string): Promise<void> {
  const breakdown = await getNetWorth(userId);
  const date = startOfDay(new Date());
  await prisma.netWorthSnapshot.upsert({
    where: { userId_date: { userId, date } },
    update: {
      totalAssetsMinor: breakdown.totalAssetsMinor,
      totalLiabilitiesMinor: breakdown.totalLiabilitiesMinor,
      liquidAssetsMinor: breakdown.liquidAssetsMinor,
      netWorthMinor: breakdown.netWorthMinor,
      baseCurrency: breakdown.baseCurrency,
    },
    create: {
      userId,
      date,
      totalAssetsMinor: breakdown.totalAssetsMinor,
      totalLiabilitiesMinor: breakdown.totalLiabilitiesMinor,
      liquidAssetsMinor: breakdown.liquidAssetsMinor,
      netWorthMinor: breakdown.netWorthMinor,
      baseCurrency: breakdown.baseCurrency,
    },
  });
}

export interface NetWorthHistoryPoint {
  date: string;
  label: string;
  netWorthMinor: bigint;
  totalAssetsMinor: bigint;
  totalLiabilitiesMinor: bigint;
}

export async function getNetWorthHistory(userId: string, months = 12): Promise<NetWorthHistoryPoint[]> {
  const since = subMonths(new Date(), months);
  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
  return snapshots.map((s) => ({
    date: format(s.date, "yyyy-MM-dd"),
    label: format(s.date, "MMM d"),
    netWorthMinor: s.netWorthMinor,
    totalAssetsMinor: s.totalAssetsMinor,
    totalLiabilitiesMinor: s.totalLiabilitiesMinor,
  }));
}

/** Net worth change vs. the closest snapshot at or before `monthsAgo` months back. Returns null deltas when there's no historical snapshot yet (e.g. brand-new install). */
export async function getNetWorthChange(userId: string, monthsAgo: number) {
  const current = await getNetWorth(userId);
  const cutoff = subMonths(new Date(), monthsAgo);
  const past = await prisma.netWorthSnapshot.findFirst({
    where: { userId, date: { lte: cutoff } },
    orderBy: { date: "desc" },
  });

  if (!past) {
    return { current, changeMinor: null as bigint | null, changePercent: null as number | null };
  }

  const changeMinor = current.netWorthMinor - past.netWorthMinor;
  const changePercent = percentOf(changeMinor, past.netWorthMinor < 0n ? -past.netWorthMinor : past.netWorthMinor);
  return { current, changeMinor, changePercent };
}

export interface MerchantSpend {
  payee: string;
  amountMinor: bigint;
  count: number;
}

export async function getSpendingByMerchant(userId: string, start: Date, end: Date): Promise<MerchantSpend[]> {
  const baseCurrency = await prisma.user
    .findUniqueOrThrow({ where: { id: userId }, select: { baseCurrency: true } })
    .then((u) => u.baseCurrency);

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end }, payee: { not: null } },
    select: { payee: true, amountMinor: true, currencyCode: true, date: true },
  });

  const byMerchant = new Map<string, { amount: bigint; count: number }>();
  for (const tx of transactions) {
    const payee = tx.payee!.trim();
    if (!payee) continue;
    const inBase = await convertToBase(tx.amountMinor, tx.currencyCode, baseCurrency, tx.date);
    const existing = byMerchant.get(payee) ?? { amount: 0n, count: 0 };
    byMerchant.set(payee, { amount: existing.amount + inBase, count: existing.count + 1 });
  }

  return Array.from(byMerchant.entries())
    .map(([payee, v]) => ({ payee, amountMinor: v.amount, count: v.count }))
    .sort((a, b) => (b.amountMinor > a.amountMinor ? 1 : -1));
}

export interface BusinessTransferSummaryRow {
  subtype: string;
  amountMinor: bigint;
  count: number;
}

export async function getBusinessTransferSummary(userId: string, start: Date, end: Date): Promise<BusinessTransferSummaryRow[]> {
  const baseCurrency = await prisma.user
    .findUniqueOrThrow({ where: { id: userId }, select: { baseCurrency: true } })
    .then((u) => u.baseCurrency);

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, type: "BUSINESS_TRANSFER", date: { gte: start, lte: end } },
    select: { businessTransferSubtype: true, amountMinor: true, currencyCode: true, date: true },
  });

  const bySubtype = new Map<string, { amount: bigint; count: number }>();
  for (const tx of transactions) {
    const key = tx.businessTransferSubtype ?? "OTHER";
    const inBase = await convertToBase(tx.amountMinor, tx.currencyCode, baseCurrency, tx.date);
    const existing = bySubtype.get(key) ?? { amount: 0n, count: 0 };
    bySubtype.set(key, { amount: existing.amount + inBase, count: existing.count + 1 });
  }

  return Array.from(bySubtype.entries()).map(([subtype, v]) => ({ subtype, amountMinor: v.amount, count: v.count }));
}

export interface UpcomingObligation {
  id: string;
  name: string;
  amountMinor: bigint;
  currencyCode: string;
  dueDate: Date;
  status: "SCHEDULED" | "DUE_SOON" | "OVERDUE";
}

export async function getUpcomingBills(userId: string, withinDays = 30): Promise<UpcomingObligation[]> {
  const now = new Date();
  const horizon = addDays(now, withinDays);
  const bills = await prisma.bill.findMany({
    where: { userId, isActive: true, nextDueDate: { lte: horizon } },
    orderBy: { nextDueDate: "asc" },
  });

  return bills.map((bill) => {
    const daysUntil = Math.ceil((bill.nextDueDate.getTime() - now.getTime()) / 86400000);
    let status: UpcomingObligation["status"] = "SCHEDULED";
    if (isAfter(now, bill.nextDueDate)) status = "OVERDUE";
    else if (daysUntil <= bill.reminderDaysBefore) status = "DUE_SOON";
    return {
      id: bill.id,
      name: bill.name,
      amountMinor: bill.amountMinor,
      currencyCode: bill.currencyCode,
      dueDate: bill.nextDueDate,
      status,
    };
  });
}
