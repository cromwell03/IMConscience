import "server-only";
import { prisma } from "@/lib/prisma";
import { computeAccountDelta } from "@/lib/ledger-core";
import type { AccountType, BusinessTransferSubtype, TransactionType } from "@/lib/types";

export { computeAccountDelta };

/** Recomputes and persists one account's currentBalanceMinor from its opening balance plus every non-deleted transaction touching it. This is intentionally a full recompute (not an incremental patch) so balances can never drift out of sync with the ledger. */
export async function recomputeAccountBalance(accountId: string): Promise<void> {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });

  const [asSource, asDestination] = await Promise.all([
    prisma.transaction.findMany({
      where: { sourceAccountId: accountId, deletedAt: null },
      select: { type: true, amountMinor: true, businessTransferSubtype: true, destinationAccountId: true },
    }),
    prisma.transaction.findMany({
      where: { destinationAccountId: accountId, deletedAt: null },
      select: { type: true, amountMinor: true, destinationAmountMinor: true },
    }),
  ]);

  let total = account.openingBalanceMinor;

  for (const tx of asSource) {
    total += computeAccountDelta({
      type: tx.type as TransactionType,
      role: "source",
      accountType: account.type as AccountType,
      amountMinor: tx.amountMinor,
      hasDestination: !!tx.destinationAccountId,
      businessTransferSubtype: tx.businessTransferSubtype as BusinessTransferSubtype | null,
    });
  }

  for (const tx of asDestination) {
    total += computeAccountDelta({
      type: tx.type as TransactionType,
      role: "destination",
      accountType: account.type as AccountType,
      amountMinor: tx.destinationAmountMinor ?? tx.amountMinor,
      hasDestination: true,
    });
  }

  await prisma.account.update({
    where: { id: accountId },
    data: { currentBalanceMinor: total },
  });
}

/** Recompute a set of accounts (deduplicated), e.g. after creating/editing/deleting a transaction that may touch a source and a destination account. */
export async function recomputeAccountBalances(accountIds: (string | null | undefined)[]): Promise<void> {
  const unique = Array.from(new Set(accountIds.filter((id): id is string => !!id)));
  for (const id of unique) {
    await recomputeAccountBalance(id);
  }
}

/** Recompute every account belonging to a user — used after bulk imports or seeding. */
export async function recomputeAllAccountBalances(userId: string): Promise<void> {
  const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true } });
  for (const account of accounts) {
    await recomputeAccountBalance(account.id);
  }
}
