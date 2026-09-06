import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatMinorUnits } from "@/lib/money";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionsTable, type TxRow } from "./transactions-table";
import { FilterBar } from "./filter-bar";
import { Upload } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Transactions — Personal Finance OS" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const and: Prisma.TransactionWhereInput[] = [];
  if (sp.q) {
    and.push({ OR: [{ description: { contains: sp.q } }, { payee: { contains: sp.q } }] });
  }
  if (sp.accountId) {
    and.push({ OR: [{ sourceAccountId: sp.accountId }, { destinationAccountId: sp.accountId }] });
  }
  if (sp.categoryId === "uncategorized") {
    and.push({ categoryId: null, isSplit: false });
  } else if (sp.categoryId) {
    and.push({ categoryId: sp.categoryId });
  }
  if (sp.type) {
    and.push({ type: sp.type });
  }
  if (sp.from || sp.to) {
    and.push({
      date: {
        ...(sp.from ? { gte: new Date(sp.from) } : {}),
        ...(sp.to ? { lte: new Date(sp.to) } : {}),
      },
    });
  }

  const where: Prisma.TransactionWhereInput = { userId: user.id, deletedAt: null, AND: and };

  const [transactions, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: 300,
      include: { category: true, sourceAccount: true, destinationAccount: true },
    }),
    prisma.account.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const rows: TxRow[] = transactions.map((tx) => ({
    id: tx.id,
    date: tx.date.toISOString(),
    description: tx.description,
    payee: tx.payee,
    amountMinor: tx.amountMinor.toString(),
    amountDisplay: formatMinorUnits(tx.amountMinor, tx.currencyCode),
    currencyCode: tx.currencyCode,
    type: tx.type,
    sourceAccountId: tx.sourceAccountId,
    sourceAccountName: tx.sourceAccount.name,
    sourceAccountType: tx.sourceAccount.type,
    destinationAccountId: tx.destinationAccountId,
    destinationAccountName: tx.destinationAccount?.name ?? null,
    categoryId: tx.categoryId,
    categoryName: tx.category?.name ?? null,
    businessTransferSubtype: tx.businessTransferSubtype,
    notes: tx.notes,
    reconciled: tx.reconciled,
    isSplit: tx.isSplit,
  }));

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name, currencyCode: a.currencyCode }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind as "INCOME" | "EXPENSE" }));

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="The complete, source-of-truth ledger."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/transactions/import">
                <Upload className="h-4 w-4" /> Import
              </Link>
            </Button>
            <TransactionDialog accounts={accountOptions} categories={categoryOptions} />
          </>
        }
      />
      <FilterBar accounts={accounts} categories={categories} />
      <TransactionsTable rows={rows} accounts={accountOptions} categories={categoryOptions} />
    </div>
  );
}
