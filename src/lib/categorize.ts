import "server-only";
import { prisma } from "@/lib/prisma";
import { toMinorUnits } from "@/lib/money";

export interface CategorizationInput {
  description: string;
  payee?: string | null;
  amountMinor: bigint;
  accountId: string;
}

export interface CategorizationResult {
  categoryId?: string;
  transactionType?: string;
  ruleId: string;
  confident: true;
}

/** Runs a user's active categorization rules (highest priority first) against one candidate transaction. Returns the first match, or null if nothing matched — callers should leave the transaction uncategorized rather than guess. Never touches already-reconciled transactions. */
export async function applyCategorizationRules(
  userId: string,
  input: CategorizationInput
): Promise<CategorizationResult | null> {
  const rules = await prisma.categorizationRule.findMany({
    where: { userId, isActive: true },
    orderBy: { priority: "desc" },
  });

  const haystackMerchant = (input.payee ?? "").toLowerCase();
  const haystackDescription = input.description.toLowerCase();

  for (const rule of rules) {
    const target =
      rule.matchField === "MERCHANT"
        ? haystackMerchant
        : rule.matchField === "DESCRIPTION"
          ? haystackDescription
          : rule.matchField === "ACCOUNT"
            ? input.accountId
            : null;

    let matched = false;

    if (rule.matchField === "AMOUNT") {
      const [minStr, maxStr] = rule.matchValue.split(":");
      try {
        const min = toMinorUnits(minStr);
        const max = toMinorUnits(maxStr);
        matched = input.amountMinor >= min && input.amountMinor <= max;
      } catch {
        matched = false;
      }
    } else if (target !== null) {
      switch (rule.matchType) {
        case "CONTAINS":
          matched = target.includes(rule.matchValue.toLowerCase());
          break;
        case "EQUALS":
          matched = target === rule.matchValue.toLowerCase();
          break;
        case "REGEX":
          try {
            matched = new RegExp(rule.matchValue, "i").test(target);
          } catch {
            matched = false;
          }
          break;
      }
    }

    if (matched) {
      return {
        categoryId: rule.categoryId ?? undefined,
        transactionType: rule.setType ?? undefined,
        ruleId: rule.id,
        confident: true,
      };
    }
  }

  return null;
}
