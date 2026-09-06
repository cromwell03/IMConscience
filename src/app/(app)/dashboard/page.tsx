import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getNetWorthChange,
  getIncomeExpenseSummary,
  getIncomeExpenseTrend,
  getSpendingByCategory,
  getAttentionNeeded,
  getUpcomingBills,
  recordTodaysNetWorthSnapshot,
  getNetWorthHistory,
  monthRange,
} from "@/lib/calculations";
import { Money } from "@/components/money";
import { getTransactionDisplay } from "@/lib/tx-display";
import type { AccountType } from "@/lib/types";
import { humanize } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { CHART_COLORS } from "@/lib/chart-colors";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Wallet, LineChart as LineChartIcon, Building2 } from "lucide-react";
import { format } from "date-fns";

export const metadata = { title: "Dashboard — Personal Finance OS" };

function pctLabel(pct: number | null) {
  if (pct === null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  await recordTodaysNetWorthSnapshot(user.id);

  const { start, end } = monthRange();
  const [netWorthChange, monthSummary, trend, categorySpend, attention, upcomingBills, netWorthHistory, accounts] =
    await Promise.all([
      getNetWorthChange(user.id, 1),
      getIncomeExpenseSummary(user.id, start, end),
      getIncomeExpenseTrend(user.id, 12),
      getSpendingByCategory(user.id, start, end),
      getAttentionNeeded(user.id),
      getUpcomingBills(user.id, 30),
      getNetWorthHistory(user.id, 12),
      prisma.account.findMany({ where: { userId: user.id, isActive: true } }),
    ]);

  const recentTransactions = await prisma.transaction.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { date: "desc" },
    take: 8,
    include: { category: true, sourceAccount: true, destinationAccount: true },
  });

  const baseCurrency = netWorthChange.current.baseCurrency;
  const liquidCash = netWorthChange.current.liquidAssetsMinor;
  const investments = netWorthChange.current.investmentsMinor;
  const totalAssets = netWorthChange.current.totalAssetsMinor;
  const totalDebt = netWorthChange.current.totalDebtMinor;

  const trendSerialized = trend.map((t) => ({
    label: t.label,
    incomeMinor: t.incomeMinor.toString(),
    expensesMinor: t.expensesMinor.toString(),
  }));
  const netWorthSerialized = netWorthHistory.map((h) => ({ label: h.label, netWorthMinor: h.netWorthMinor.toString() }));
  const categorySerialized = categorySpend.map((c) => ({ categoryName: c.categoryName, amountMinor: c.amountMinor.toString() }));

  return (
    <div className="flex flex-col gap-6">
      {/* Net worth hero */}
      <Card className="bg-sidebar text-white border-none">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Net Worth</p>
              <div className="mt-1 flex items-baseline gap-3">
                <Money amountMinor={netWorthChange.current.netWorthMinor} currencyCode={baseCurrency} className="text-3xl font-semibold" />
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                {netWorthChange.changeMinor !== null ? (
                  <>
                    <span className={netWorthChange.changeMinor >= 0n ? "text-emerald-300" : "text-red-300"}>
                      {netWorthChange.changeMinor >= 0n ? <ArrowUpRight className="inline h-3.5 w-3.5" /> : <ArrowDownRight className="inline h-3.5 w-3.5" />}
                      {" "}
                      <Money amountMinor={netWorthChange.changeMinor} currencyCode={baseCurrency} signed />
                    </span>
                    <span className="text-white/50">this month ({pctLabel(netWorthChange.changePercent)})</span>
                  </>
                ) : (
                  <span className="text-white/50">Tracking starts today — history will build up from here.</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <p className="text-white/50 text-xs">Liquid Cash</p>
                <Money amountMinor={liquidCash} currencyCode={baseCurrency} className="font-medium" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Investments</p>
                <Money amountMinor={investments} currencyCode={baseCurrency} className="font-medium" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Total Assets</p>
                <Money amountMinor={totalAssets} currencyCode={baseCurrency} className="font-medium" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Total Debt</p>
                <Money amountMinor={totalDebt} currencyCode={baseCurrency} className="font-medium" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This month */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile icon={ArrowUpRight} label="Income" value={<Money amountMinor={monthSummary.incomeMinor} currencyCode={baseCurrency} />} tone="positive" />
        <SummaryTile icon={ArrowDownRight} label="Expenses" value={<Money amountMinor={monthSummary.expensesMinor} currencyCode={baseCurrency} />} tone="negative" />
        <SummaryTile icon={Wallet} label="Saved / Invested" value={<Money amountMinor={monthSummary.netCashFlowMinor} currencyCode={baseCurrency} colorize />} />
        <SummaryTile
          icon={LineChartIcon}
          label="Savings Rate"
          value={<span className="tabular-nums">{monthSummary.savingsRatePercent !== null ? `${monthSummary.savingsRatePercent.toFixed(1)}%` : "—"}</span>}
        />
        <SummaryTile icon={Building2} label="Net Cash Flow" value={<Money amountMinor={monthSummary.netCashFlowMinor} currencyCode={baseCurrency} colorize signed />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Income vs Expenses</CardTitle>
              <CardDescription>Last 12 months</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart data={trendSerialized} currencyCode={baseCurrency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Attention Needed</CardTitle>
              <CardDescription>{attention.length} item{attention.length === 1 ? "" : "s"}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
            {attention.length === 0 && <p className="text-sm text-muted">Nothing needs your attention right now.</p>}
            {attention.map((item) => (
              <Link
                key={item.id}
                href={item.href ?? "#"}
                className="flex items-start gap-2 rounded-md border border-border p-2.5 hover:bg-surface-muted transition-colors"
              >
                <AlertTriangle
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    item.severity === "high" ? "text-negative" : item.severity === "medium" ? "text-warning" : "text-muted"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted truncate">{item.description}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Net Worth Trend</CardTitle>
              <CardDescription>Snapshots over time</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {netWorthSerialized.length > 1 ? (
              <NetWorthChart data={netWorthSerialized} currencyCode={baseCurrency} />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-muted text-center px-4">
                Come back tomorrow — net worth history builds a snapshot every day you visit.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>This month</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categorySerialized} currencyCode={baseCurrency} />
            <div className="mt-2 flex flex-col gap-1.5">
              {categorySpend.slice(0, 6).map((c, i) => (
                <div key={c.categoryId ?? "uncategorized"} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: CHART_COLORS.categorical[i % CHART_COLORS.categorical.length] }} />
                    <span className="truncate">{c.categoryName}</span>
                  </span>
                  <Money amountMinor={c.amountMinor} currencyCode={baseCurrency} className="shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming Obligations</CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
            {upcomingBills.length === 0 && <p className="text-sm text-muted">No bills due in the next 30 days.</p>}
            {upcomingBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between rounded-md border border-border p-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{bill.name}</p>
                  <p className="text-xs text-muted">{format(bill.dueDate, "MMM d, yyyy")}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Money amountMinor={bill.amountMinor} currencyCode={bill.currencyCode} className="text-sm" />
                  <Badge tone={bill.status === "OVERDUE" ? "negative" : bill.status === "DUE_SOON" ? "warning" : "neutral"}>
                    {humanize(bill.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest activity across all accounts</CardDescription>
          </div>
          <Link href="/transactions" className="text-xs font-medium text-accent hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {recentTransactions.length === 0 && <p className="text-sm text-muted py-4">No transactions yet.</p>}
          {recentTransactions.map((tx) => {
            const display = getTransactionDisplay(tx, tx.sourceAccountId, tx.sourceAccountId, tx.sourceAccount.type as AccountType);
            return (
              <div key={tx.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted truncate">
                    {tx.sourceAccount.name}
                    {tx.destinationAccount ? ` → ${tx.destinationAccount.name}` : ""} · {tx.category?.name ?? humanize(tx.type)} ·{" "}
                    {format(tx.date, "MMM d")}
                  </p>
                </div>
                <Money
                  amountMinor={display.amountMinor}
                  currencyCode={tx.currencyCode}
                  colorize={display.colorize}
                  signed
                  className="shrink-0 text-sm font-medium"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted">{accounts.length} active account{accounts.length === 1 ? "" : "s"} tracked · base currency {baseCurrency}</p>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted">
          <Icon className={`h-3.5 w-3.5 ${tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : ""}`} />
          <span className="text-xs">{label}</span>
        </div>
        <div className="mt-1.5 text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
