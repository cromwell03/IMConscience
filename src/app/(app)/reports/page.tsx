import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Money } from "@/components/money";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { getIncomeExpenseSummary, getSpendingByCategory, getSpendingByMerchant, getBusinessTransferSummary } from "@/lib/calculations";
import { resolveDateRange } from "./date-range";
import { RangePicker } from "./range-picker";
import { BUSINESS_TRANSFER_SUBTYPE_LABELS, LIABILITY_ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType, type BusinessTransferSubtype } from "@/lib/types";

export const metadata = { title: "Reports — Personal Finance OS" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const { start, end } = resolveDateRange(sp.range, sp.from, sp.to);

  const [summary, categorySpend, merchantSpend, businessSummary, accounts] = await Promise.all([
    getIncomeExpenseSummary(user.id, start, end),
    getSpendingByCategory(user.id, start, end),
    getSpendingByMerchant(user.id, start, end),
    getBusinessTransferSummary(user.id, start, end),
    prisma.account.findMany({ where: { userId: user.id, isActive: true }, orderBy: { type: "asc" } }),
  ]);

  const baseCurrency = summary.baseCurrency;
  const categorySerialized = categorySpend.map((c) => ({ categoryName: c.categoryName, amountMinor: c.amountMinor.toString() }));

  return (
    <div>
      <PageHeader title="Reports" description="Financial analytics for any period you choose." actions={<RangePicker />} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <SummaryCard label="Income" amount={summary.incomeMinor} currency={baseCurrency} />
        <SummaryCard label="Expenses" amount={summary.expensesMinor} currency={baseCurrency} />
        <SummaryCard label="Net Cash Flow" amount={summary.netCashFlowMinor} currency={baseCurrency} colorize />
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted">Savings Rate</p>
            <p className="text-lg font-semibold tabular-nums">
              {summary.savingsRatePercent !== null ? `${summary.savingsRatePercent.toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categorySerialized} currencyCode={baseCurrency} />
            <Table>
              <TableBody>
                {categorySpend.map((c) => (
                  <TableRow key={c.categoryId ?? "uncategorized"}>
                    <TableCell>{c.categoryName}</TableCell>
                    <TableCell className="text-right">
                      <Money amountMinor={c.amountMinor} currencyCode={baseCurrency} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Merchant</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchantSpend.slice(0, 15).map((m) => (
                  <TableRow key={m.payee}>
                    <TableCell>{m.payee}</TableCell>
                    <TableCell className="text-right text-muted">{m.count}</TableCell>
                    <TableCell className="text-right">
                      <Money amountMinor={m.amountMinor} currencyCode={baseCurrency} />
                    </TableCell>
                  </TableRow>
                ))}
                {merchantSpend.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted py-6">
                      No merchant data for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business-Related Personal Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businessSummary.map((b) => (
                  <TableRow key={b.subtype}>
                    <TableCell>{BUSINESS_TRANSFER_SUBTYPE_LABELS[b.subtype as BusinessTransferSubtype] ?? b.subtype}</TableCell>
                    <TableCell className="text-right text-muted">{b.count}</TableCell>
                    <TableCell className="text-right">
                      <Money amountMinor={b.amountMinor} currencyCode={baseCurrency} />
                    </TableCell>
                  </TableRow>
                ))}
                {businessSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted py-6">
                      No business-related transfers in this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => {
                  const isLiability = LIABILITY_ACCOUNT_TYPES.includes(a.type as AccountType);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell className="text-muted">{ACCOUNT_TYPE_LABELS[a.type as AccountType]}</TableCell>
                      <TableCell className="text-right">
                        <Money amountMinor={isLiability ? -a.currentBalanceMinor : a.currentBalanceMinor} currencyCode={a.currencyCode} colorize />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, amount, currency, colorize }: { label: string; amount: bigint; currency: string; colorize?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted">{label}</p>
        <Money amountMinor={amount} currencyCode={currency} className="text-lg font-semibold" colorize={colorize} />
      </CardContent>
    </Card>
  );
}
