// Shared helpers so every transaction list (dashboard, account ledger,
// transactions table) shows the same, correctly-signed amount.
//
// Two different notions of "sign" are both legitimate and we need both:
//  - For EXPENSE / INCOME / REFUND, users think in terms of "did money
//    leave or arrive for me" independent of which instrument was used —
//    a credit-card purchase is still spending, so it's always shown red/
//    negative even though it *increases* the card's own liability balance.
//  - For TRANSFER / DEBT_PAYMENT / INVESTMENT / BUSINESS_TRANSFER, there's
//    no inherent gain or loss — what matters is which way money moved for
//    the specific account being viewed, which is exactly what the ledger's
//    computeAccountDelta already calculates (and correctly flips for
//    liability accounts). We show that number but leave it uncolored.
import { computeAccountDelta } from "@/lib/ledger-core";
import type { AccountType, BusinessTransferSubtype, TransactionType } from "@/lib/types";

export interface DisplayableTransaction {
  type: string;
  amountMinor: bigint;
  destinationAccountId: string | null;
  destinationAmountMinor?: bigint | null;
  businessTransferSubtype: string | null;
}

/** Signed amount as it affects `accountId`, which must be either the transaction's source or destination account. Matches the real ledger delta (see lib/ledger-core.ts) — this is the number that explains a balance change, not a "spending" figure. */
export function signedAmountForAccount(
  tx: DisplayableTransaction,
  accountId: string,
  sourceAccountId: string,
  accountType: AccountType
): bigint {
  const role: "source" | "destination" = accountId === sourceAccountId ? "source" : "destination";
  const amountMinor = role === "destination" ? (tx.destinationAmountMinor ?? tx.amountMinor) : tx.amountMinor;
  return computeAccountDelta({
    type: tx.type as TransactionType,
    role,
    accountType,
    amountMinor,
    hasDestination: !!tx.destinationAccountId,
    businessTransferSubtype: tx.businessTransferSubtype as BusinessTransferSubtype | null,
  });
}

export interface TransactionDisplayAmount {
  amountMinor: bigint;
  /** Whether to color it green/red (only meaningful for actual income/spending, not transfers). */
  colorize: boolean;
}

/** The amount + whether to colorize it, for one row in a transaction list viewed from `viewAccountId`'s perspective. */
export function getTransactionDisplay(
  tx: DisplayableTransaction,
  viewAccountId: string,
  sourceAccountId: string,
  accountType: AccountType
): TransactionDisplayAmount {
  if (tx.type === "EXPENSE") return { amountMinor: -tx.amountMinor, colorize: true };
  if (tx.type === "INCOME" || tx.type === "REFUND") return { amountMinor: tx.amountMinor, colorize: true };
  return { amountMinor: signedAmountForAccount(tx, viewAccountId, sourceAccountId, accountType), colorize: false };
}
