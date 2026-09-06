"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { recomputeAccountBalances } from "@/lib/ledger";
import { toMinorUnits } from "@/lib/money";
import { applyCategorizationRules } from "@/lib/categorize";
import type { NormalizedImportRow, ColumnMapping } from "@/lib/import";
import { ActionError } from "./form-utils";

export interface AnalyzedImportRow extends NormalizedImportRow {
  suggestedType: "INCOME" | "EXPENSE";
  suggestedCategoryId: string | null;
  isDuplicate: boolean;
  duplicateReason?: string;
}

export async function getSavedMapping(accountId: string): Promise<ColumnMapping | null> {
  const user = await requireUser();
  const mapping = await prisma.importMapping.findFirst({
    where: { userId: user.id, accountId },
    orderBy: { createdAt: "desc" },
  });
  if (!mapping) return null;
  try {
    return JSON.parse(mapping.mapping) as ColumnMapping;
  } catch {
    return null;
  }
}

export async function analyzeImportRows(accountId: string, rows: NormalizedImportRow[]): Promise<AnalyzedImportRow[]> {
  const user = await requireUser();
  const account = await prisma.account.findFirstOrThrow({ where: { id: accountId, userId: user.id } });

  if (rows.length === 0) return [];
  const dates = rows.map((r) => new Date(r.date).getTime());
  const minDate = new Date(Math.min(...dates) - 3 * 86400000);
  const maxDate = new Date(Math.max(...dates) + 3 * 86400000);

  const existing = await prisma.transaction.findMany({
    where: { sourceAccountId: accountId, deletedAt: null, date: { gte: minDate, lte: maxDate } },
    select: { date: true, amountMinor: true, description: true },
  });

  const results: AnalyzedImportRow[] = [];
  for (const row of rows) {
    const amountMinor = toMinorUnits(Math.abs(row.amount).toString(), account.currencyCode);
    const rowDate = new Date(row.date);

    const duplicate = existing.find((tx) => {
      const dayDiff = Math.abs(tx.date.getTime() - rowDate.getTime()) / 86400000;
      const sameAmount = tx.amountMinor === amountMinor;
      const similarDescription =
        tx.description.toLowerCase().trim() === row.description.toLowerCase().trim() ||
        tx.description.toLowerCase().includes(row.description.toLowerCase().slice(0, 10));
      return dayDiff <= 2 && sameAmount && similarDescription;
    });

    const suggestedType: "INCOME" | "EXPENSE" = row.amount < 0 ? "EXPENSE" : "INCOME";
    const rule = await applyCategorizationRules(user.id, {
      description: row.description,
      payee: row.payee,
      amountMinor,
      accountId,
    });

    results.push({
      ...row,
      suggestedType,
      suggestedCategoryId: rule?.categoryId ?? null,
      isDuplicate: !!duplicate,
      duplicateReason: duplicate ? `Matches existing transaction on ${duplicate.date.toDateString()}` : undefined,
    });
  }

  return results;
}

export interface CommitImportRow {
  date: string;
  description: string;
  payee?: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId?: string | null;
  include: boolean;
}

export async function commitImport(
  accountId: string,
  rows: CommitImportRow[],
  sourceFilename: string,
  mappingToSave?: ColumnMapping
) {
  const user = await requireUser();
  const account = await prisma.account.findFirstOrThrow({ where: { id: accountId, userId: user.id } });

  const included = rows.filter((r) => r.include);
  if (included.length === 0) throw new ActionError("No rows selected to import.");

  const batch = await prisma.importBatch.create({
    data: {
      userId: user.id,
      accountId,
      sourceFilename,
      columnMapping: JSON.stringify(mappingToSave ?? {}),
      rowCount: included.length,
    },
  });

  for (const row of included) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date(row.date),
        description: row.description,
        payee: row.payee,
        amountMinor: toMinorUnits(Math.abs(row.amount).toString(), account.currencyCode),
        currencyCode: account.currencyCode,
        type: row.type,
        sourceAccountId: accountId,
        categoryId: row.categoryId ?? null,
        importBatchId: batch.id,
        notes: `Imported from ${sourceFilename}`,
      },
    });
  }

  if (mappingToSave) {
    const existingMapping = await prisma.importMapping.findFirst({ where: { userId: user.id, accountId } });
    if (existingMapping) {
      await prisma.importMapping.update({
        where: { id: existingMapping.id },
        data: { mapping: JSON.stringify(mappingToSave) },
      });
    } else {
      await prisma.importMapping.create({
        data: {
          userId: user.id,
          accountId,
          name: `Default for ${account.name}`,
          mapping: JSON.stringify(mappingToSave),
        },
      });
    }
  }

  await recomputeAccountBalances([accountId]);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");

  return { imported: included.length, batchId: batch.id };
}
