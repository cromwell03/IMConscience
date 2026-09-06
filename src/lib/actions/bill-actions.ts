"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { recomputeAccountBalances } from "@/lib/ledger";
import { toMinorUnits } from "@/lib/money";
import { computeNextDueDate } from "@/lib/bills";
import { BILL_FREQUENCIES, type BillFrequency } from "@/lib/types";
import { str, optStr, checked, optInt, ActionError } from "./form-utils";

export async function createBill(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  const frequency = str(formData, "frequency") as BillFrequency;
  const amountStr = str(formData, "amount");
  const nextDueDateStr = str(formData, "nextDueDate");
  const currencyCode = optStr(formData, "currencyCode") ?? "PHP";

  if (!name) throw new ActionError("Bill name is required.");
  if (!BILL_FREQUENCIES.includes(frequency)) throw new ActionError("Invalid frequency.");
  if (!amountStr) throw new ActionError("Amount is required.");
  if (!nextDueDateStr) throw new ActionError("Next due date is required.");

  await prisma.bill.create({
    data: {
      userId: user.id,
      name,
      categoryId: optStr(formData, "categoryId"),
      amountMinor: toMinorUnits(amountStr, currencyCode),
      currencyCode,
      frequency,
      customIntervalDays: optInt(formData, "customIntervalDays"),
      accountId: optStr(formData, "accountId"),
      nextDueDate: new Date(nextDueDateStr),
      autoPay: checked(formData, "autoPay"),
      reminderDaysBefore: optInt(formData, "reminderDaysBefore") ?? 3,
      notes: optStr(formData, "notes"),
    },
  });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
}

export async function updateBill(billId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.bill.findFirstOrThrow({ where: { id: billId, userId: user.id } });
  const currencyCode = optStr(formData, "currencyCode") ?? existing.currencyCode;
  const amountStr = optStr(formData, "amount");
  const nextDueDateStr = optStr(formData, "nextDueDate");

  await prisma.bill.update({
    where: { id: billId },
    data: {
      name: str(formData, "name") || undefined,
      categoryId: optStr(formData, "categoryId"),
      amountMinor: amountStr ? toMinorUnits(amountStr, currencyCode) : undefined,
      currencyCode,
      frequency: (optStr(formData, "frequency") as BillFrequency) ?? undefined,
      customIntervalDays: optInt(formData, "customIntervalDays"),
      accountId: optStr(formData, "accountId"),
      nextDueDate: nextDueDateStr ? new Date(nextDueDateStr) : undefined,
      autoPay: formData.has("autoPay") ? checked(formData, "autoPay") : undefined,
      reminderDaysBefore: optInt(formData, "reminderDaysBefore"),
      isActive: formData.has("isActive") ? checked(formData, "isActive") : undefined,
      notes: optStr(formData, "notes"),
    },
  });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
}

export async function deleteBill(billId: string) {
  const user = await requireUser();
  await prisma.bill.findFirstOrThrow({ where: { id: billId, userId: user.id } });
  await prisma.bill.delete({ where: { id: billId } });
  revalidatePath("/bills");
  revalidatePath("/dashboard");
}

export async function markBillPaid(billId: string, formData: FormData) {
  const user = await requireUser();
  const bill = await prisma.bill.findFirstOrThrow({ where: { id: billId, userId: user.id } });

  const paidDateStr = optStr(formData, "paidDate") ?? new Date().toISOString();
  const amountStr = optStr(formData, "amount");
  const amountMinor = amountStr ? toMinorUnits(amountStr, bill.currencyCode) : bill.amountMinor;
  const accountId = optStr(formData, "accountId") ?? bill.accountId;

  if (!accountId) throw new ActionError("Select which account paid this bill.");

  const account = await prisma.account.findFirstOrThrow({ where: { id: accountId, userId: user.id } });

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      date: new Date(paidDateStr),
      description: `${bill.name} payment`,
      amountMinor,
      currencyCode: account.currencyCode,
      type: "EXPENSE",
      sourceAccountId: accountId,
      categoryId: bill.categoryId,
      notes: "Auto-recorded from Bills",
    },
  });

  await recomputeAccountBalances([accountId]);

  await prisma.billPayment.create({
    data: {
      billId,
      dueDate: bill.nextDueDate,
      paidDate: new Date(paidDateStr),
      amountMinor,
      status: "PAID",
      transactionId: transaction.id,
    },
  });

  const nextDueDate = computeNextDueDate(bill.nextDueDate, bill.frequency as BillFrequency, bill.customIntervalDays);
  await prisma.bill.update({ where: { id: billId }, data: { nextDueDate } });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}
