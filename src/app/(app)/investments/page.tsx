import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Money } from "@/components/money";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { AddHoldingDialog, UpdateValuationDialog } from "./holding-dialogs";
import { deleteHolding } from "@/lib/actions/investment-actions";
import { getAccountValuationMinor } from "@/lib/calculations";
import { formatMinorUnits, multiplyQuantityByPriceMinor } from "@/lib/money";
import { ASSET_CLASSES } from "@/lib/types";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Investments — Personal Finance OS" };

export default async function InvestmentsPage() {
  const user = await requireUser();
  const accounts = await prisma.account.findMany({
    where: { userId: user.id, type: "INVESTMENT" },
    include: { holdings: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Investments" description="Stocks, ETFs, funds, crypto, and time deposits. Valuations are entered manually for now." />

      {accounts.length === 0 ? (
        <EmptyState
          title="No investment accounts yet"
          description="Add an account of type Investment on the Accounts page, then track holdings here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {await Promise.all(accounts.map(async (account) => {
            // When no holdings are recorded, the account's value is its
            // ledger cash balance (money moved in via INVESTMENT-type
            // transactions) — same fallback net worth uses, so the two
            // stay consistent. Gain/loss only means something once
            // holdings with a cost basis exist.
            const totalValue =
              account.holdings.length > 0
                ? account.holdings.reduce(
                    (sum, h) => sum + multiplyQuantityByPriceMinor(h.quantity, h.currentPriceMinor ?? h.averageCostMinor),
                    0n
                  )
                : await getAccountValuationMinor(account);
            const totalCost = account.holdings.reduce((sum, h) => sum + multiplyQuantityByPriceMinor(h.quantity, h.averageCostMinor), 0n);
            const gainLoss = totalValue - totalCost;

            return (
              <Card key={account.id}>
                <CardHeader>
                  <div>
                    <CardTitle>
                      <Link href={`/accounts/${account.id}`} className="hover:underline">
                        {account.name}
                      </Link>
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-4 text-sm">
                      <Money amountMinor={totalValue} currencyCode={account.currencyCode} className="font-semibold" />
                      <Money amountMinor={gainLoss} currencyCode={account.currencyCode} colorize signed className="text-xs" />
                    </div>
                  </div>
                  <AddHoldingDialog accountId={account.id} />
                </CardHeader>
                <CardContent>
                  {account.holdings.length === 0 ? (
                    <p className="text-sm text-muted">No holdings recorded yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Holding</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Avg Cost</TableHead>
                          <TableHead className="text-right">Current Price</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">Gain/Loss</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {account.holdings.map((h) => {
                          const value = multiplyQuantityByPriceMinor(h.quantity, h.currentPriceMinor ?? h.averageCostMinor);
                          const cost = multiplyQuantityByPriceMinor(h.quantity, h.averageCostMinor);
                          const hGainLoss = value - cost;
                          return (
                            <TableRow key={h.id}>
                              <TableCell>
                                <p className="text-sm font-medium">{h.name}</p>
                                {h.symbol && <p className="text-xs text-muted">{h.symbol}</p>}
                              </TableCell>
                              <TableCell className="text-xs text-muted">{humanize(h.assetClass)}</TableCell>
                              <TableCell className="text-right text-sm">{h.quantity}</TableCell>
                              <TableCell className="text-right text-sm">
                                <Money amountMinor={h.averageCostMinor} currencyCode={account.currencyCode} />
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <Money amountMinor={h.currentPriceMinor ?? h.averageCostMinor} currencyCode={account.currencyCode} />
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                <Money amountMinor={value} currencyCode={account.currencyCode} />
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <Money amountMinor={hGainLoss} currencyCode={account.currencyCode} colorize signed />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <UpdateValuationDialog
                                    holdingId={h.id}
                                    currentPrice={formatMinorUnits(h.currentPriceMinor ?? h.averageCostMinor, account.currencyCode)}
                                    quantity={h.quantity}
                                  />
                                  <ConfirmActionButton
                                    variant="ghost"
                                    size="icon"
                                    action={deleteHolding.bind(null, h.id)}
                                    confirmMessage={`Remove ${h.name}?`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-muted" />
                                  </ConfirmActionButton>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          }))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Asset classes supported: {ASSET_CLASSES.join(", ")}</p>
    </div>
  );
}
