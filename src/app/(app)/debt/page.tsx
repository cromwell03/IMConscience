import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/money";
import { estimatePayoffMonths } from "@/lib/debt";
import { monthRange } from "@/lib/calculations";
import { LIABILITY_ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/types";

export const metadata = { title: "Debt — Personal Finance OS" };

export default async function DebtPage() {
  const user = await requireUser();
  const accounts = await prisma.account.findMany({
    where: { userId: user.id, isActive: true, type: { in: LIABILITY_ACCOUNT_TYPES } },
    orderBy: { currentBalanceMinor: "desc" },
  });

  const { start, end } = monthRange();
  const paymentsThisMonth = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      date: { gte: start, lte: end },
      destinationAccountId: { in: accounts.map((a) => a.id) },
      type: { in: ["TRANSFER", "DEBT_PAYMENT"] },
    },
    select: { destinationAccountId: true, destinationAmountMinor: true, amountMinor: true },
  });

  const paymentsByAccount = new Map<string, bigint>();
  for (const p of paymentsThisMonth) {
    if (!p.destinationAccountId) continue;
    const amt = p.destinationAmountMinor ?? p.amountMinor;
    paymentsByAccount.set(p.destinationAccountId, (paymentsByAccount.get(p.destinationAccountId) ?? 0n) + amt);
  }

  const totalDebt = accounts.reduce((sum, a) => sum + a.currentBalanceMinor, 0n);
  const totalMonthlyPayments = Array.from(paymentsByAccount.values()).reduce((sum, v) => sum + v, 0n);

  return (
    <div>
      <PageHeader title="Debt" description="Credit cards, loans, and other liabilities." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted">Total Debt</p>
            <Money amountMinor={totalDebt} className="text-lg font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted">Paid This Month</p>
            <Money amountMinor={totalMonthlyPayments} className="text-lg font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted">Accounts</p>
            <p className="text-lg font-semibold">{accounts.length}</p>
          </CardContent>
        </Card>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title="No debt tracked" description="Add a credit card or loan account to track balances and payoff progress." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {accounts.map((account) => {
            const payoffMonths = estimatePayoffMonths(account.currentBalanceMinor, account.interestRateBps, account.minimumPaymentMinor);
            const paidThisMonth = paymentsByAccount.get(account.id) ?? 0n;
            return (
              <Link key={account.id} href={`/accounts/${account.id}`}>
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{account.name}</p>
                      <span className="text-xs text-muted">{ACCOUNT_TYPE_LABELS[account.type as AccountType]}</span>
                    </div>
                    <Money amountMinor={account.currentBalanceMinor} currencyCode={account.currencyCode} className="mt-1 text-xl font-semibold text-negative" />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
                      {account.interestRateBps !== null && <p>APR: {(account.interestRateBps / 100).toFixed(2)}%</p>}
                      {account.minimumPaymentMinor && (
                        <p>
                          Min: <Money amountMinor={account.minimumPaymentMinor} currencyCode={account.currencyCode} />
                        </p>
                      )}
                      <p>
                        Paid this month: <Money amountMinor={paidThisMonth} currencyCode={account.currencyCode} />
                      </p>
                      <p>{payoffMonths !== null ? `Payoff in ~${payoffMonths} mo` : "Payoff: insufficient data"}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
