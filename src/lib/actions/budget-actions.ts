"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toMinorUnits } from "@/lib/money";
import { str, ActionError } from "./form-utils";

export async function setBudget(formData: FormData) {
  const user = await requireUser();
  const month = str(formData, "month");
  const categoryId = str(formData, "categoryId");
  const amountStr = str(formData, "amount");

  if (!/^\d{4}-\d{2}$/.test(month)) throw new ActionError("Invalid month.");
  if (!categoryId) throw new ActionError("Category is required.");
  if (!amountStr) throw new ActionError("Amount is required.");

  const amountMinor = toMinorUnits(amountStr);

  await prisma.budget.upsert({
    where: { userId_month_categoryId: { userId: user.id, month, categoryId } },
    update: { amountMinor },
    create: { userId: user.id, month, categoryId, amountMinor },
  });

  revalidatePath("/budget");
  revalidatePath("/dashboard");
}

export async function deleteBudget(budgetId: string) {
  const user = await requireUser();
  await prisma.budget.deleteMany({ where: { id: budgetId, userId: user.id } });
  revalidatePath("/budget");
}

export async function copyBudgetToMonth(fromMonth: string, toMonth: string) {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}$/.test(fromMonth) || !/^\d{4}-\d{2}$/.test(toMonth)) {
    throw new ActionError("Invalid month.");
  }

  const sourceBudgets = await prisma.budget.findMany({ where: { userId: user.id, month: fromMonth } });
  for (const budget of sourceBudgets) {
    await prisma.budget.upsert({
      where: { userId_month_categoryId: { userId: user.id, month: toMonth, categoryId: budget.categoryId } },
      update: { amountMinor: budget.amountMinor },
      create: {
        userId: user.id,
        month: toMonth,
        categoryId: budget.categoryId,
        amountMinor: budget.amountMinor,
      },
    });
  }

  revalidatePath("/budget");
}
