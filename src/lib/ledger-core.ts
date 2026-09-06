// Pure ledger math with no Node/DB dependencies, so it can run anywhere:
// server actions, the seed script, or tests. See lib/ledger.ts for the
// DB-touching recompute functions that use this.
import {
  LIABILITY_ACCOUNT_TYPES,
  BUSINESS_TRANSFER_INFLOW_SUBTYPES,
  type AccountType,
  type BusinessTransferSubtype,
  type TransactionType,
} from "@/lib/types";

/**
 * The single source of truth for how one transaction affects one account's
 * balance. Every account type keeps its balance in "natural" terms: an
 * asset-like account's balance is what you own; a liability account's
 * (CREDIT_CARD, LOAN) balance is what you owe. A purchase therefore
 * *increases* a credit card's balance, while a payment toward it decreases
 * it — this is what prevents credit-card double-counting.
 */
export function computeAccountDelta(params: {
  type: TransactionType;
  role: "source" | "destination";
  accountType: AccountType;
  amountMinor: bigint;
  hasDestination: boolean;
  businessTransferSubtype?: BusinessTransferSubtype | null;
}): bigint {
  const { type, role, accountType, hasDestination, businessTransferSubtype } = params;
  const amountMinor = params.amountMinor;
  const isLiability = LIABILITY_ACCOUNT_TYPES.includes(accountType);

  if (role === "source") {
    switch (type) {
      case "INCOME":
      case "REFUND":
        return isLiability ? -amountMinor : amountMinor;
      case "EXPENSE":
        return isLiability ? amountMinor : -amountMinor;
      case "ADJUSTMENT":
        return amountMinor;
      case "TRANSFER":
      case "DEBT_PAYMENT":
      case "INVESTMENT":
        return -amountMinor;
      case "BUSINESS_TRANSFER": {
        if (hasDestination) return -amountMinor;
        const inflow =
          !!businessTransferSubtype &&
          BUSINESS_TRANSFER_INFLOW_SUBTYPES.includes(businessTransferSubtype);
        return inflow ? amountMinor : -amountMinor;
      }
      default:
        return 0n;
    }
  }

  switch (type) {
    case "TRANSFER":
    case "DEBT_PAYMENT":
    case "INVESTMENT":
    case "BUSINESS_TRANSFER":
      return isLiability ? -amountMinor : amountMinor;
    default:
      return 0n;
  }
}
