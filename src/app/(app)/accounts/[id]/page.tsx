import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Money } from "@/components/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { AccountDialog } from "../account-dialog";
import { ReconcileDialog } from "../reconcile-dialog";
import { archiveAccount, reactivateAccount, deleteAccount } from "@/lib/actions/account-actions";
import { getTransactionDisplay } from "@/lib/tx-display";
import { ACCOUNT_TYPE_LABELS, LIABILITY_ACCOUNT_TYPES, TRANSACTION_TYPE_LABELS, type AccountType } from "@/lib/types";
import { Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const account = await prisma.account.findFirst({ where: { id, userId: user.id }, include: { institution: true } });
  if (!account) notFound();

  const [transactions, institutions, reconciliations] = await Promise.all([
    prisma.transaction.findMany({
      where: { OR: [{ sourceAccountId: id }, { destinationAccountId: id }], deletedAt: null },
      orderBy: { date: "desc" },
      take: 100,
      include: { category: true, sourceAccount: true, destinationAccount: true },
    }),
    prisma.institution.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.reconciliation.findMany({ where: { accountId: id }, orderBy: { statementDate: "desc" }, take: 5 }),
  ]);

  const isLiability = LIABILITY_ACCOUNT_TYPES.includes(account.type as AccountType);

  return (
    <div>
      <PageHeader
        title={account.name}
        description={`${ACCOUNT_TYPE_LABELS[account.type as AccountType]}${account.institution ? ` · ${account.institution.name}` : ""}`}
        actions={
          <>
            <ReconcileDialog accountId={account.id} />
            <AccountDialog
              institutions={institutions}
              currencies={["PHP", "USD"]}
              existing={{
                id: account.id,
                name: account.name,
                type: account.type,
                ownership: account.ownership,
                currencyCode: account.currencyCode,
                institutionId: account.institutionId,
                lastFourDigits: account.lastFourDigits,
                notes: account.notes,
                statementDay: account.statementDay,
                paymentDueDay: account.paymentDueDay,
                includeInNetWorth: account.includeInNetWorth,
              }}
              trigger={
                <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm hover:bg-surface-muted">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              }
            />
            {account.isActive ? (
              <ConfirmActionButton
                variant="outline"
                size="sm"
                action={archiveAccount.bind(null, account.id)}
                confirmMessage="Archive this account? It will be hidden from active lists but its history stays intact."
                successMessage="Account archived"
              >
                <Archive className="h-4 w-4" /> Archive
              </ConfirmActionButton>
            ) : (
              <ConfirmActionButton
                variant="outline"
                size="sm"
                action={reactivateAccount.bind(null, account.id)}
                confirmMessage="Reactivate this account?"
                successMessage="Account reactivated"
              >
                <ArchiveRestore className="h-4 w-4" /> Reactivate
              </ConfirmActionButton>
            )}
            <ConfirmActionButton
              variant="destructive"
              size="sm"
              action={deleteAccount.bind(null, account.id)}
              confirmMessage="Permanently delete this account? Only possible if it has no transactions."
            >
              <Trash2 className="h-4 w-4" /> Delete
            </ConfirmActionButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 mb-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-5">
            <p className="text-xs text-muted">Current balance</p>
            <Money
              amountMinor={isLiability ? -account.currentBalanceMinor : account.currentBalanceMinor}
              currencyCode={account.currencyCode}
              className="text-2xl font-semibold"
              colorize
            />
            {isLiability && <p className="text-xs text-muted mt-1">amount owed</p>}
            {account.creditLimitMinor && (
              <p className="text-xs text-muted mt-2">
                Limit: <Money amountMinor={account.creditLimitMinor} currencyCode={account.currencyCode} />
              </p>
            )}
            {account.interestRateBps !== null && account.interestRateBps !== undefined && (
              <p className="text-xs text-muted">APR: {(account.interestRateBps / 100).toFixed(2)}%</p>
            )}
            {account.minimumPaymentMinor && (
              <p className="text-xs text-muted">
                Min payment: <Money amountMinor={account.minimumPaymentMinor} currencyCode={account.currencyCode} />
              </p>
            )}
            {account.lastReconciledAt && (
              <p className="text-xs text-muted mt-2">Last reconciled {format(account.lastReconciledAt, "MMM d, yyyy")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Reconciliations</CardTitle>
          </CardHeader>
          <CardContent>
            {reconciliations.length === 0 ? (
              <p className="text-sm text-muted">No reconciliations recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statement Date</TableHead>
                    <TableHead>Statement Balance</TableHead>
                    <TableHead>Calculated Balance</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{format(r.statementDate, "MMM d, yyyy")}</TableCell>
                      <TableCell><Money amountMinor={r.statementBalanceMinor} currencyCode={account.currencyCode} /></TableCell>
                      <TableCell><Money amountMinor={r.calculatedBalanceMinor} currencyCode={account.currencyCode} /></TableCell>
                      <TableCell><Money amountMinor={r.differenceMinor} currencyCode={account.currencyCode} colorize signed /></TableCell>
                      <TableCell>
                        <Badge tone={r.status === "BALANCED" ? "positive" : "warning"}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <Link href={`/transactions?accountId=${account.id}`} className="text-xs font-medium text-accent hover:underline">
            Open in ledger
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const display = getTransactionDisplay(tx, id, tx.sourceAccountId, account.type as AccountType);
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">{format(tx.date, "MMM d, yyyy")}</TableCell>
                    <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                    <TableCell>
                      <Badge tone="neutral">{TRANSACTION_TYPE_LABELS[tx.type as keyof typeof TRANSACTION_TYPE_LABELS] ?? tx.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted">{tx.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Money amountMinor={display.amountMinor} currencyCode={account.currencyCode} colorize={display.colorize} signed />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {transactions.length === 0 && <p className="text-sm text-muted py-6 text-center">No transactions yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
