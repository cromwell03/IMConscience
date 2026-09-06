import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Money } from "@/components/money";
import { NetWorthChart } from "@/components/charts/net-worth-chart";
import {
  getNetWorth,
  getNetWorthChange,
  getNetWorthHistory,
  getAccountValuationMinor,
  recordTodaysNetWorthSnapshot,
} from "@/lib/calculations";
import { LIABILITY_ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/types";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Net Worth — Personal Finance OS" };

export default async function NetWorthPage() {
  const user = await requireUser();
  await recordTodaysNetWorthSnapshot(user.id);

  const [breakdown, changeMonth, changeYear, history, accounts, assets] = await Promise.all([
    getNetWorth(user.id),
    getNetWorthChange(user.id, 1),
    getNetWorthChange(user.id, 12),
    getNetWorthHistory(user.id, 24),
    prisma.account.findMany({ where: { userId: user.id, isActive: true, includeInNetWorth: true } }),
    prisma.asset.findMany({ where: { userId: user.id, includeInNetWorth: true } }),
  ]);

  const historySerialized = history.map((h) => ({ label: h.label, netWorthMinor: h.netWorthMinor.toString() }));

  const accountsWithValuation = await Promise.all(
    accounts.map(async (a) => ({ ...a, valuation: await getAccountValuationMinor(a) }))
  );

  const assetsList = accounts.length + assets.length === 0;

  return (
    <div>
      <PageHeader title="Net Worth" description="Assets minus liabilities, tracked over time." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted">Net Worth</p>
            <Money amountMinor={breakdown.netWorthMinor} currencyCode={breakdown.baseCurrency} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted">Liquid Net Worth</p>
            <Money amountMinor={breakdown.liquidAssetsMinor - breakdown.totalLiabilitiesMinor} currencyCode={breakdown.baseCurrency} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted">MoM Change</p>
            {changeMonth.changeMinor !== null ? (
              <Money amountMinor={changeMonth.changeMinor} currencyCode={breakdown.baseCurrency} colorize signed className="text-xl font-semibold" />
            ) : (
              <p className="text-xl font-semibold text-muted">—</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted">YoY Change</p>
            {changeYear.changeMinor !== null ? (
              <Money amountMinor={changeYear.changeMinor} currencyCode={breakdown.baseCurrency} colorize signed className="text-xl font-semibold" />
            ) : (
              <p className="text-xl font-semibold text-muted">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div>
            <CardTitle>History</CardTitle>
            <CardDescription>Daily snapshots, last 24 months</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {historySerialized.length > 1 ? (
            <NetWorthChart data={historySerialized} currencyCode={breakdown.baseCurrency} />
          ) : (
            <p className="py-10 text-center text-sm text-muted">History builds a snapshot every day you visit the app.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {accountsWithValuation
              .filter((a) => !LIABILITY_ACCOUNT_TYPES.includes(a.type as AccountType))
              .map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {a.name} <span className="text-xs text-muted">({ACCOUNT_TYPE_LABELS[a.type as AccountType]})</span>
                  </span>
                  <Money amountMinor={a.valuation} currencyCode={a.currencyCode} />
                </div>
              ))}
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {asset.name} <span className="text-xs text-muted">({humanize(asset.type)})</span>
                </span>
                <Money amountMinor={asset.currentValueMinor} currencyCode={asset.currencyCode} />
              </div>
            ))}
            {assetsList && <p className="text-sm text-muted py-4">No assets tracked yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liabilities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {accountsWithValuation
              .filter((a) => LIABILITY_ACCOUNT_TYPES.includes(a.type as AccountType))
              .map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {a.name} <span className="text-xs text-muted">({ACCOUNT_TYPE_LABELS[a.type as AccountType]})</span>
                  </span>
                  <Money amountMinor={a.valuation} currencyCode={a.currencyCode} className="text-negative" />
                </div>
              ))}
            {accountsWithValuation.filter((a) => LIABILITY_ACCOUNT_TYPES.includes(a.type as AccountType)).length === 0 && (
              <p className="text-sm text-muted py-4">No liabilities tracked.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
