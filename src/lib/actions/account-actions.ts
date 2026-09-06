"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { recomputeAccountBalance } from "@/lib/ledger";
import { toMinorUnits } from "@/lib/money";
import { ACCOUNT_TYPES, ACCOUNT_OWNERSHIPS, type AccountType, type AccountOwnership } from "@/lib/types";
import { str, optStr, checked, optInt, ActionError } from "./form-utils";

async function resolveInstitution(userId: string, institutionId?: string, newName?: string) {
  if (institutionId) return institutionId;
  if (newName) {
    const existing = await prisma.institution.findFirst({ where: { userId, name: newName } });
    if (existing) return existing.id;
    const created = await prisma.institution.create({ data: { userId, name: newName } });
    return created.id;
  }
  return undefined;
}

export async function createAccount(formData: FormData) {
  const user = await requireUser();

  const name = str(formData, "name");
  const type = str(formData, "type") as AccountType;
  const ownership = (optStr(formData, "ownership") as AccountOwnership) ?? "PERSONAL";
  const currencyCode = str(formData, "currencyCode") || "PHP";

  if (!name) throw new ActionError("Account name is required.");
  if (!ACCOUNT_TYPES.includes(type)) throw new ActionError("Invalid account type.");
  if (!ACCOUNT_OWNERSHIPS.includes(ownership)) throw new ActionError("Invalid account ownership.");

  const openingBalanceStr = optStr(formData, "openingBalance") ?? "0";
  const openingBalanceMinor = toMinorUnits(openingBalanceStr, currencyCode);

  const institutionId = await resolveInstitution(
    user.id,
    optStr(formData, "institutionId"),
    optStr(formData, "newInstitutionName")
  );

  const creditLimit = optStr(formData, "creditLimit");
  const interestRate = optStr(formData, "interestRate");
  const minimumPayment = optStr(formData, "minimumPayment");
  const originalBalance = optStr(formData, "originalBalance");

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name,
      type,
      ownership,
      currencyCode,
      institutionId,
      openingBalanceMinor,
      openingBalanceDate: new Date(),
      currentBalanceMinor: openingBalanceMinor,
      creditLimitMinor: creditLimit ? toMinorUnits(creditLimit, currencyCode) : undefined,
      interestRateBps: interestRate ? Math.round(Number.parseFloat(interestRate) * 100) : undefined,
      minimumPaymentMinor: minimumPayment ? toMinorUnits(minimumPayment, currencyCode) : undefined,
      originalBalanceMinor: originalBalance ? toMinorUnits(originalBalance, currencyCode) : undefined,
      termMonths: optInt(formData, "termMonths"),
      statementDay: optInt(formData, "statementDay"),
      paymentDueDay: optInt(formData, "paymentDueDay"),
      lastFourDigits: optStr(formData, "lastFourDigits"),
      includeInNetWorth: formData.has("includeInNetWorth") ? checked(formData, "includeInNetWorth") : true,
      notes: optStr(formData, "notes"),
    },
  });

  await recomputeAccountBalance(account.id);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function updateAccount(accountId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.account.findFirstOrThrow({ where: { id: accountId, userId: user.id } });

  const name = str(formData, "name") || existing.name;
  const type = (optStr(formData, "type") as AccountType) ?? (existing.type as AccountType);
  const currencyCode = optStr(formData, "currencyCode") ?? existing.currencyCode;

  const institutionId = await resolveInstitution(
    user.id,
    optStr(formData, "institutionId"),
    optStr(formData, "newInstitutionName")
  );

  const openingBalanceStr = optStr(formData, "openingBalance");
  const creditLimit = optStr(formData, "creditLimit");
  const interestRate = optStr(formData, "interestRate");
  const minimumPayment = optStr(formData, "minimumPayment");
  const originalBalance = optStr(formData, "originalBalance");

  await prisma.account.update({
    where: { id: accountId },
    data: {
      name,
      type,
      ownership: (optStr(formData, "ownership") as AccountOwnership) ?? existing.ownership,
      currencyCode,
      institutionId: institutionId ?? existing.institutionId,
      openingBalanceMinor: openingBalanceStr ? toMinorUnits(openingBalanceStr, currencyCode) : undefined,
      creditLimitMinor: creditLimit ? toMinorUnits(creditLimit, currencyCode) : undefined,
      interestRateBps: interestRate ? Math.round(Number.parseFloat(interestRate) * 100) : undefined,
      minimumPaymentMinor: minimumPayment ? toMinorUnits(minimumPayment, currencyCode) : undefined,
      originalBalanceMinor: originalBalance ? toMinorUnits(originalBalance, currencyCode) : undefined,
      termMonths: optInt(formData, "termMonths"),
      statementDay: optInt(formData, "statementDay"),
      paymentDueDay: optInt(formData, "paymentDueDay"),
      lastFourDigits: optStr(formData, "lastFourDigits"),
      isActive: formData.has("isActive") ? checked(formData, "isActive") : existing.isActive,
      includeInNetWorth: formData.has("includeInNetWorth") ? checked(formData, "includeInNetWorth") : existing.includeInNetWorth,
      notes: optStr(formData, "notes") ?? existing.notes,
    },
  });

  await recomputeAccountBalance(accountId);
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/dashboard");
}

export async function archiveAccount(accountId: string) {
  const user = await requireUser();
  await prisma.account.updateMany({ where: { id: accountId, userId: user.id }, data: { isActive: false } });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function reactivateAccount(accountId: string) {
  const user = await requireUser();
  await prisma.account.updateMany({ where: { id: accountId, userId: user.id }, data: { isActive: true } });
  revalidatePath("/accounts");
}

export async function deleteAccount(accountId: string) {
  const user = await requireUser();
  await prisma.account.findFirstOrThrow({ where: { id: accountId, userId: user.id } });

  const txCount = await prisma.transaction.count({
    where: { OR: [{ sourceAccountId: accountId }, { destinationAccountId: accountId }] },
  });
  if (txCount > 0) {
    throw new ActionError(
      `This account has ${txCount} transaction(s) on record. Archive it instead of deleting to preserve your financial history.`
    );
  }

  await prisma.account.delete({ where: { id: accountId } });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function recordReconciliation(accountId: string, formData: FormData) {
  const user = await requireUser();
  const account = await prisma.account.findFirstOrThrow({ where: { id: accountId, userId: user.id } });

  const statementDateStr = str(formData, "statementDate");
  const statementBalanceStr = str(formData, "statementBalance");
  if (!statementDateStr || !statementBalanceStr) {
    throw new ActionError("Statement date and balance are required.");
  }

  await recomputeAccountBalance(accountId);
  const fresh = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });

  const statementBalanceMinor = toMinorUnits(statementBalanceStr, account.currencyCode);
  const calculatedBalanceMinor = fresh.currentBalanceMinor;
  const differenceMinor = statementBalanceMinor - calculatedBalanceMinor;
  const status = differenceMinor === 0n ? "BALANCED" : "DISCREPANCY";

  await prisma.reconciliation.create({
    data: {
      userId: user.id,
      accountId,
      statementDate: new Date(statementDateStr),
      statementBalanceMinor,
      calculatedBalanceMinor,
      differenceMinor,
      status,
      notes: optStr(formData, "notes"),
    },
  });

  await prisma.account.update({
    where: { id: accountId },
    data: {
      lastReconciledAt: new Date(statementDateStr),
      lastReconciledBalanceMinor: statementBalanceMinor,
    },
  });

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  return { status, differenceMinor };
}
