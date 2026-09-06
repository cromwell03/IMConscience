"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { RULE_FIELDS, RULE_MATCH_TYPES, TRANSACTION_TYPES, type RuleField, type RuleMatchType, type TransactionType } from "@/lib/types";
import { str, optStr, checked, optInt, ActionError } from "./form-utils";

// --- Institutions ---------------------------------------------------------

export async function createInstitution(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new ActionError("Institution name is required.");
  await prisma.institution.upsert({
    where: { userId_name: { userId: user.id, name } },
    update: {},
    create: { userId: user.id, name, notes: optStr(formData, "notes") },
  });
  revalidatePath("/settings/institutions");
}

export async function deleteInstitution(institutionId: string) {
  const user = await requireUser();
  const inUse = await prisma.account.count({ where: { institutionId } });
  if (inUse > 0) throw new ActionError("This institution is linked to one or more accounts.");
  await prisma.institution.deleteMany({ where: { id: institutionId, userId: user.id } });
  revalidatePath("/settings/institutions");
}

// --- Currencies & exchange rates ------------------------------------------

export async function createCurrency(formData: FormData) {
  await requireUser();
  const code = str(formData, "code").toUpperCase();
  const name = str(formData, "name");
  const symbol = str(formData, "symbol");
  if (!/^[A-Z]{3}$/.test(code)) throw new ActionError("Currency code must be a 3-letter ISO code.");
  if (!name || !symbol) throw new ActionError("Name and symbol are required.");

  await prisma.currency.upsert({
    where: { code },
    update: { name, symbol },
    create: { code, name, symbol },
  });
  revalidatePath("/settings/currencies");
}

export async function setExchangeRate(formData: FormData) {
  await requireUser();
  const currencyCode = str(formData, "currencyCode").toUpperCase();
  const rateStr = str(formData, "rate");
  const asOfDateStr = optStr(formData, "asOfDate") ?? new Date().toISOString();

  if (!currencyCode) throw new ActionError("Currency is required.");
  const rate = Number.parseFloat(rateStr);
  if (Number.isNaN(rate) || rate <= 0) throw new ActionError("Enter a valid positive exchange rate.");

  const rateMicros = BigInt(Math.round(rate * 1_000_000));

  await prisma.exchangeRate.create({
    data: { currencyCode, rateMicros, asOfDate: new Date(asOfDateStr) },
  });
  revalidatePath("/settings/currencies");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
}

// --- Categorization rules ---------------------------------------------------

export async function createRule(formData: FormData) {
  const user = await requireUser();
  const matchField = str(formData, "matchField") as RuleField;
  const matchType = str(formData, "matchType") as RuleMatchType;
  const matchValue = str(formData, "matchValue");

  if (!RULE_FIELDS.includes(matchField)) throw new ActionError("Invalid rule field.");
  if (!RULE_MATCH_TYPES.includes(matchType)) throw new ActionError("Invalid match type.");
  if (!matchValue) throw new ActionError("Match value is required.");

  const setType = optStr(formData, "setType") as TransactionType | undefined;
  if (setType && !TRANSACTION_TYPES.includes(setType)) throw new ActionError("Invalid transaction type.");

  await prisma.categorizationRule.create({
    data: {
      userId: user.id,
      priority: optInt(formData, "priority") ?? 0,
      matchField,
      matchType,
      matchValue,
      categoryId: optStr(formData, "categoryId"),
      setType,
    },
  });

  revalidatePath("/settings/rules");
}

export async function updateRule(ruleId: string, formData: FormData) {
  const user = await requireUser();
  await prisma.categorizationRule.findFirstOrThrow({ where: { id: ruleId, userId: user.id } });

  await prisma.categorizationRule.update({
    where: { id: ruleId },
    data: {
      priority: optInt(formData, "priority"),
      matchField: (optStr(formData, "matchField") as RuleField) ?? undefined,
      matchType: (optStr(formData, "matchType") as RuleMatchType) ?? undefined,
      matchValue: optStr(formData, "matchValue"),
      categoryId: optStr(formData, "categoryId"),
      setType: (optStr(formData, "setType") as TransactionType) ?? null,
      isActive: formData.has("isActive") ? checked(formData, "isActive") : undefined,
    },
  });

  revalidatePath("/settings/rules");
}

export async function deleteRule(ruleId: string) {
  const user = await requireUser();
  await prisma.categorizationRule.deleteMany({ where: { id: ruleId, userId: user.id } });
  revalidatePath("/settings/rules");
}

// --- Profile ---------------------------------------------------------------

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: optStr(formData, "name"),
      baseCurrency: optStr(formData, "baseCurrency") ?? undefined,
    },
  });
  revalidatePath("/settings");
}

export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const currentPassword = str(formData, "currentPassword");
  const newPassword = str(formData, "newPassword");

  if (newPassword.length < 8) throw new ActionError("New password must be at least 8 characters.");
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new ActionError("Current password is incorrect.");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  revalidatePath("/settings");
}
