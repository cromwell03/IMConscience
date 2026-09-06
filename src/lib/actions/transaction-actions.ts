"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { recomputeAccountBalances } from "@/lib/ledger";
import { toMinorUnits } from "@/lib/money";
import { applyCategorizationRules } from "@/lib/categorize";
import {
  TRANSACTION_TYPES,
  TRANSFER_LIKE_TYPES,
  BUSINESS_TRANSFER_SUBTYPES,
  type TransactionType,
  type BusinessTransferSubtype,
} from "@/lib/types";
import { str, optStr, checked, ActionError } from "./form-utils";

interface ParsedSplit {
  categoryId: string | null;
  amountMinor: bigint;
  notes?: string;
}

function parseSplits(json: string | undefined, currencyCode: string): ParsedSplit[] {
  if (!json) return [];
  let raw: { categoryId?: string | null; amount: string; notes?: string }[];
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ActionError("Invalid split data.");
  }
  return raw.map((s) => ({
    categoryId: s.categoryId || null,
    amountMinor: toMinorUnits(s.amount, currencyCode),
    notes: s.notes,
  }));
}

async function upsertTags(userId: string, tagsCsv: string | undefined): Promise<string[]> {
  if (!tagsCsv) return [];
  const names = tagsCsv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const ids: string[] = [];
  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name },
    });
    ids.push(tag.id);
  }
  return ids;
}

export async function createTransaction(formData: FormData) {
  const user = await requireUser();

  const type = str(formData, "type") as TransactionType;
  if (!TRANSACTION_TYPES.includes(type)) throw new ActionError("Invalid transaction type.");

  const sourceAccountId = str(formData, "sourceAccountId");
  if (!sourceAccountId) throw new ActionError("Account is required.");
  const sourceAccount = await prisma.account.findFirstOrThrow({
    where: { id: sourceAccountId, userId: user.id },
  });

  const description = str(formData, "description");
  if (!description) throw new ActionError("Description is required.");

  const amountStr = str(formData, "amount");
  if (!amountStr) throw new ActionError("Amount is required.");
  const amountMinor = toMinorUnits(amountStr, sourceAccount.currencyCode);
  if (amountMinor <= 0n) throw new ActionError("Amount must be greater than zero.");

  const isTransferLike = TRANSFER_LIKE_TYPES.includes(type);
  let destinationAccountId = optStr(formData, "destinationAccountId") ?? null;
  let destinationAmountMinor: bigint | null = null;
  let businessTransferSubtype: BusinessTransferSubtype | null = null;

  if (type === "TRANSFER" || type === "DEBT_PAYMENT" || type === "INVESTMENT") {
    if (!destinationAccountId) throw new ActionError("A destination account is required for this transaction type.");
    if (destinationAccountId === sourceAccountId) throw new ActionError("Source and destination accounts must differ.");
  }

  if (type === "BUSINESS_TRANSFER") {
    const subtype = str(formData, "businessTransferSubtype") as BusinessTransferSubtype;
    if (!BUSINESS_TRANSFER_SUBTYPES.includes(subtype)) {
      throw new ActionError("Select a business transfer subtype.");
    }
    businessTransferSubtype = subtype;
    if (!destinationAccountId) destinationAccountId = null;
  }

  if (!isTransferLike) {
    destinationAccountId = null;
  }

  if (destinationAccountId) {
    const destinationAccount = await prisma.account.findFirstOrThrow({
      where: { id: destinationAccountId, userId: user.id },
    });
    if (destinationAccount.currencyCode !== sourceAccount.currencyCode) {
      const destAmountStr = optStr(formData, "destinationAmount");
      if (!destAmountStr) {
        throw new ActionError(
          `${sourceAccount.name} and ${destinationAccount.name} use different currencies — enter the amount received in ${destinationAccount.currencyCode}.`
        );
      }
      destinationAmountMinor = toMinorUnits(destAmountStr, destinationAccount.currencyCode);
    }
  }

  let categoryId = optStr(formData, "categoryId") ?? null;
  if (isTransferLike) categoryId = null;
  if (!categoryId && (type === "INCOME" || type === "EXPENSE")) {
    const suggestion = await applyCategorizationRules(user.id, {
      description,
      payee: optStr(formData, "payee"),
      amountMinor,
      accountId: sourceAccountId,
    });
    if (suggestion?.categoryId) categoryId = suggestion.categoryId;
  }

  const splits = parseSplits(optStr(formData, "splitsJson"), sourceAccount.currencyCode);
  const isSplit = splits.length > 0;
  if (isSplit) {
    const splitTotal = splits.reduce((sum, s) => sum + s.amountMinor, 0n);
    if (splitTotal !== amountMinor) {
      throw new ActionError("Split amounts must add up to the total transaction amount.");
    }
    categoryId = null;
  }

  const tagIds = await upsertTags(user.id, optStr(formData, "tagsCsv"));

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      date: new Date(str(formData, "date") || Date.now()),
      description,
      payee: optStr(formData, "payee"),
      amountMinor,
      currencyCode: sourceAccount.currencyCode,
      destinationAmountMinor,
      type,
      sourceAccountId,
      destinationAccountId,
      categoryId,
      businessTransferSubtype,
      notes: optStr(formData, "notes"),
      reconciled: checked(formData, "reconciled"),
      isSplit,
      splits: isSplit
        ? { create: splits.map((s) => ({ categoryId: s.categoryId, amountMinor: s.amountMinor, notes: s.notes })) }
        : undefined,
      tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
  });

  await recomputeAccountBalances([sourceAccountId, destinationAccountId]);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  return transaction;
}

export async function updateTransaction(transactionId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.transaction.findFirstOrThrow({
    where: { id: transactionId, userId: user.id, deletedAt: null },
  });

  const type = (optStr(formData, "type") as TransactionType) ?? (existing.type as TransactionType);
  const sourceAccountId = optStr(formData, "sourceAccountId") ?? existing.sourceAccountId;
  const sourceAccount = await prisma.account.findFirstOrThrow({ where: { id: sourceAccountId, userId: user.id } });

  const amountStr = optStr(formData, "amount");
  const amountMinor = amountStr ? toMinorUnits(amountStr, sourceAccount.currencyCode) : existing.amountMinor;
  if (amountMinor <= 0n) throw new ActionError("Amount must be greater than zero.");

  const isTransferLike = TRANSFER_LIKE_TYPES.includes(type);
  const destinationAccountId = isTransferLike
    ? (optStr(formData, "destinationAccountId") ?? existing.destinationAccountId)
    : null;
  let destinationAmountMinor: bigint | null = null;
  let businessTransferSubtype: BusinessTransferSubtype | null = null;

  if ((type === "TRANSFER" || type === "DEBT_PAYMENT" || type === "INVESTMENT") && !destinationAccountId) {
    throw new ActionError("A destination account is required for this transaction type.");
  }
  if (destinationAccountId === sourceAccountId) throw new ActionError("Source and destination accounts must differ.");

  if (type === "BUSINESS_TRANSFER") {
    const subtype =
      (optStr(formData, "businessTransferSubtype") as BusinessTransferSubtype) ??
      (existing.businessTransferSubtype as BusinessTransferSubtype | null);
    if (!subtype || !BUSINESS_TRANSFER_SUBTYPES.includes(subtype)) {
      throw new ActionError("Select a business transfer subtype.");
    }
    businessTransferSubtype = subtype;
  }

  if (destinationAccountId) {
    const destinationAccount = await prisma.account.findFirstOrThrow({
      where: { id: destinationAccountId, userId: user.id },
    });
    if (destinationAccount.currencyCode !== sourceAccount.currencyCode) {
      const destAmountStr = optStr(formData, "destinationAmount");
      const fallback = existing.destinationAmountMinor;
      if (!destAmountStr && !fallback) {
        throw new ActionError(
          `${sourceAccount.name} and ${destinationAccount.name} use different currencies — enter the amount received in ${destinationAccount.currencyCode}.`
        );
      }
      destinationAmountMinor = destAmountStr ? toMinorUnits(destAmountStr, destinationAccount.currencyCode) : fallback;
    }
  }

  let categoryId = isTransferLike ? null : (optStr(formData, "categoryId") ?? existing.categoryId);

  const splitsJson = optStr(formData, "splitsJson");
  const splits = parseSplits(splitsJson, sourceAccount.currencyCode);
  const isSplit = splitsJson !== undefined ? splits.length > 0 : existing.isSplit;
  if (isSplit && splitsJson !== undefined) {
    const splitTotal = splits.reduce((sum, s) => sum + s.amountMinor, 0n);
    if (splitTotal !== amountMinor) {
      throw new ActionError("Split amounts must add up to the total transaction amount.");
    }
    categoryId = null;
  }

  const previousAccounts = [existing.sourceAccountId, existing.destinationAccountId];

  await prisma.$transaction(async (tx) => {
    if (splitsJson !== undefined) {
      await tx.transactionSplit.deleteMany({ where: { transactionId } });
    }
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        date: optStr(formData, "date") ? new Date(str(formData, "date")) : undefined,
        description: optStr(formData, "description"),
        payee: optStr(formData, "payee"),
        amountMinor,
        currencyCode: sourceAccount.currencyCode,
        destinationAmountMinor,
        type,
        sourceAccountId,
        destinationAccountId,
        categoryId,
        businessTransferSubtype,
        notes: optStr(formData, "notes"),
        reconciled: formData.has("reconciled") ? checked(formData, "reconciled") : undefined,
        isSplit,
        splits:
          splitsJson !== undefined && isSplit
            ? { create: splits.map((s) => ({ categoryId: s.categoryId, amountMinor: s.amountMinor, notes: s.notes })) }
            : undefined,
      },
    });
  });

  await recomputeAccountBalances([...previousAccounts, sourceAccountId, destinationAccountId]);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function deleteTransaction(transactionId: string) {
  const user = await requireUser();
  const existing = await prisma.transaction.findFirstOrThrow({ where: { id: transactionId, userId: user.id } });

  await prisma.transaction.update({ where: { id: transactionId }, data: { deletedAt: new Date() } });
  await recomputeAccountBalances([existing.sourceAccountId, existing.destinationAccountId]);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function bulkDeleteTransactions(transactionIds: string[]) {
  const user = await requireUser();
  const txs = await prisma.transaction.findMany({ where: { id: { in: transactionIds }, userId: user.id } });
  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds }, userId: user.id },
    data: { deletedAt: new Date() },
  });
  const accountIds = txs.flatMap((t) => [t.sourceAccountId, t.destinationAccountId]);
  await recomputeAccountBalances(accountIds);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}

export async function bulkCategorize(transactionIds: string[], categoryId: string) {
  const user = await requireUser();
  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds }, userId: user.id, reconciled: false },
    data: { categoryId, isSplit: false },
  });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function toggleReconciled(transactionId: string) {
  const user = await requireUser();
  const existing = await prisma.transaction.findFirstOrThrow({ where: { id: transactionId, userId: user.id } });
  await prisma.transaction.update({ where: { id: transactionId }, data: { reconciled: !existing.reconciled } });
  revalidatePath("/transactions");
}
