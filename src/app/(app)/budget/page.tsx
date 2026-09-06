import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { formatMinorUnits, percentOf } from "@/lib/money";
import { MonthNav } from "./month-nav";
import { BudgetAmountInput } from "./budget-amount-input";
import { CopyBudgetButton } from "./copy-budget-button";
import { format, parse } from "date-fns";

export const metadata = { title: "Budget — Personal Finance OS" };

function statusFor(pct: number | null): { label: string; tone: "positive" | "warning" | "negative" | "neutral" } {
  if (pct === null) return { label: "No budget", tone: "neutral" };
  if (pct >= 100) return { label: "Over Budget", tone: "negative" };
  if (pct >= 85) return { label: "Needs Attention", tone: "warning" };
  return { label: "On Track", tone: "positive" };
}

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : format(new Date(), "yyyy-MM");
  const monthDate = parse(month, "yyyy-MM", new Date());
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

  const prevMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const prevMonth = format(prevMonthDate, "yyyy-MM");

  const [categories, budgets, expenseAgg] = await Promise.all([
    prisma.category.findMany({ where: { userId: user.id, kind: "EXPENSE", isActive: true }, orderBy: { name: "asc" } }),
    prisma.budget.findMany({ where: { userId: user.id, month } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: user.id, deletedAt: null, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
      _sum: { amountMinor: true },
    }),
  ]);

  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b]));
  const spentByCategory = new Map(expenseAgg.map((e) => [e.categoryId, e._sum.amountMinor ?? 0n]));

  const totalBudget = budgets.reduce((sum, b) => sum + b.amountMinor, 0n);
  const totalSpent = Array.from(spentByCategory.values()).reduce((sum, v) => sum + v, 0n);

  return (
    <div>
      <PageHeader
        title="Budget"
        description="Set monthly targets by category and track actual spending."
        actions={
          <>
            <MonthNav month={month} label={format(monthDate, "MMMM yyyy")} />
            <CopyBudgetButton fromMonth={prevMonth} toMonth={month} />
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-4 pb-4 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-muted">Total Budgeted</p>
            <Money amountMinor={totalBudget} className="text-lg font-semibold" />
          </div>
          <div>
            <p className="text-xs text-muted">Total Spent</p>
            <Money amountMinor={totalSpent} className="text-lg font-semibold" />
          </div>
          <div>
            <p className="text-xs text-muted">Remaining</p>
            <Money amountMinor={totalBudget - totalSpent} colorize className="text-lg font-semibold" />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {categories.map((cat) => {
          const budget = budgetByCategory.get(cat.id);
          const spent = spentByCategory.get(cat.id) ?? 0n;
          const budgetAmount = budget?.amountMinor ?? 0n;
          const pct = budget ? percentOf(spent, budgetAmount) : null;
          const status = statusFor(pct);
          const remaining = budgetAmount - spent;

          return (
            <div key={cat.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:w-48 shrink-0">
                <p className="text-sm font-medium">{cat.name}</p>
              </div>
              <div className="flex-1 flex items-center gap-4">
                <div className="flex-1 min-w-[120px]">
                  <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className={`h-full ${pct !== null && pct >= 100 ? "bg-negative" : pct !== null && pct >= 85 ? "bg-warning" : "bg-accent"}`}
                      style={{ width: `${pct !== null ? Math.min(100, pct) : 0}%` }}
                    />
                  </div>
                </div>
                <Money amountMinor={spent} className="w-24 text-sm text-right shrink-0" />
                <span className="text-muted text-xs shrink-0">of</span>
                <BudgetAmountInput month={month} categoryId={cat.id} defaultValue={budget ? formatMinorUnits(budgetAmount) : ""} />
                {budget ? (
                  <Money amountMinor={remaining} colorize className="w-24 text-sm text-right shrink-0 hidden sm:block" />
                ) : (
                  <span className="w-24 text-sm text-right shrink-0 hidden sm:block text-muted">—</span>
                )}
                <Badge tone={status.tone} className="shrink-0 w-32 justify-center">
                  {status.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
