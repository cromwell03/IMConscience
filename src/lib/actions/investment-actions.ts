"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toMinorUnits } from "@/lib/money";
import { ASSET_CLASSES, type AssetClass } from "@/lib/types";
import { str, optStr, ActionError } from "./form-utils";

export async function createHolding(accountId: string, formData: FormData) {
  const user = await requireUser();
  const account = await prisma.account.findFirstOrThrow({ where: { id: accountId, userId: user.id } });

  const name = str(formData, "name");
  const assetClass = str(formData, "assetClass") as AssetClass;
  const quantity = str(formData, "quantity");
  const averageCostStr = str(formData, "averageCost");

  if (!name) throw new ActionError("Holding name is required.");
  if (!ASSET_CLASSES.includes(assetClass)) throw new ActionError("Invalid asset class.");
  if (!quantity) throw new ActionError("Quantity is required.");
  if (!averageCostStr) throw new ActionError("Average cost is required.");

  const currentPriceStr = optStr(formData, "currentPrice");

  await prisma.holding.create({
    data: {
      accountId,
      symbol: optStr(formData, "symbol"),
      name,
      assetClass,
      quantity,
      averageCostMinor: toMinorUnits(averageCostStr, account.currencyCode),
      currentPriceMinor: currentPriceStr ? toMinorUnits(currentPriceStr, account.currencyCode) : undefined,
      lastValuationDate: currentPriceStr ? new Date() : undefined,
      notes: optStr(formData, "notes"),
    },
  });

  revalidatePath("/investments");
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}

export async function updateHoldingValuation(holdingId: string, formData: FormData) {
  const user = await requireUser();
  const holding = await prisma.holding.findFirstOrThrow({
    where: { id: holdingId, account: { userId: user.id } },
    include: { account: true },
  });

  const priceStr = str(formData, "currentPrice");
  if (!priceStr) throw new ActionError("Price is required.");
  const priceMinor = toMinorUnits(priceStr, holding.account.currencyCode);
  const quantity = optStr(formData, "quantity") ?? holding.quantity;

  await prisma.$transaction([
    prisma.holding.update({
      where: { id: holdingId },
      data: { currentPriceMinor: priceMinor, quantity, lastValuationDate: new Date() },
    }),
    prisma.holdingValuation.create({
      data: { holdingId, date: new Date(), priceMinor, quantity },
    }),
  ]);

  revalidatePath("/investments");
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}

export async function deleteHolding(holdingId: string) {
  const user = await requireUser();
  await prisma.holding.deleteMany({ where: { id: holdingId, account: { userId: user.id } } });
  revalidatePath("/investments");
  revalidatePath("/net-worth");
}
