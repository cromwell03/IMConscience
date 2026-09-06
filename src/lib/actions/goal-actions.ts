"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toMinorUnits } from "@/lib/money";
import { GOAL_TYPES, type GoalType } from "@/lib/types";
import { str, optStr, ActionError } from "./form-utils";

export async function createGoal(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  const type = str(formData, "type") as GoalType;
  const targetAmountStr = str(formData, "targetAmount");
  const currencyCode = optStr(formData, "currencyCode") ?? "PHP";

  if (!name) throw new ActionError("Goal name is required.");
  if (!GOAL_TYPES.includes(type)) throw new ActionError("Invalid goal type.");
  if (!targetAmountStr) throw new ActionError("Target amount is required.");

  const currentAmountStr = optStr(formData, "currentAmount");
  const monthlyStr = optStr(formData, "monthlyContributionTarget");
  const targetDateStr = optStr(formData, "targetDate");

  await prisma.goal.create({
    data: {
      userId: user.id,
      name,
      type,
      targetAmountMinor: toMinorUnits(targetAmountStr, currencyCode),
      currentAmountMinor: currentAmountStr ? toMinorUnits(currentAmountStr, currencyCode) : 0n,
      currencyCode,
      targetDate: targetDateStr ? new Date(targetDateStr) : undefined,
      monthlyContributionTargetMinor: monthlyStr ? toMinorUnits(monthlyStr, currencyCode) : undefined,
      linkedAccountId: optStr(formData, "linkedAccountId"),
      notes: optStr(formData, "notes"),
    },
  });

  revalidatePath("/goals");
}

export async function updateGoal(goalId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.goal.findFirstOrThrow({ where: { id: goalId, userId: user.id } });
  const currencyCode = optStr(formData, "currencyCode") ?? existing.currencyCode;

  const targetAmountStr = optStr(formData, "targetAmount");
  const currentAmountStr = optStr(formData, "currentAmount");
  const monthlyStr = optStr(formData, "monthlyContributionTarget");
  const targetDateStr = optStr(formData, "targetDate");

  await prisma.goal.update({
    where: { id: goalId },
    data: {
      name: str(formData, "name") || undefined,
      targetAmountMinor: targetAmountStr ? toMinorUnits(targetAmountStr, currencyCode) : undefined,
      currentAmountMinor: currentAmountStr ? toMinorUnits(currentAmountStr, currencyCode) : undefined,
      currencyCode,
      targetDate: targetDateStr ? new Date(targetDateStr) : undefined,
      monthlyContributionTargetMinor: monthlyStr ? toMinorUnits(monthlyStr, currencyCode) : undefined,
      linkedAccountId: optStr(formData, "linkedAccountId") ?? null,
      isActive: formData.has("isActive") ? formData.get("isActive") === "on" : undefined,
      notes: optStr(formData, "notes"),
    },
  });

  revalidatePath("/goals");
}

export async function deleteGoal(goalId: string) {
  const user = await requireUser();
  await prisma.goal.deleteMany({ where: { id: goalId, userId: user.id } });
  revalidatePath("/goals");
}
