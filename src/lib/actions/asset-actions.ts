"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toMinorUnits } from "@/lib/money";
import { ASSET_TYPES, type AssetType } from "@/lib/types";
import { str, optStr, checked, ActionError } from "./form-utils";

export async function createAsset(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  const type = str(formData, "type") as AssetType;
  const currentValueStr = str(formData, "currentValue");
  const currencyCode = optStr(formData, "currencyCode") ?? "PHP";

  if (!name) throw new ActionError("Asset name is required.");
  if (!ASSET_TYPES.includes(type)) throw new ActionError("Invalid asset type.");
  if (!currentValueStr) throw new ActionError("Current value is required.");

  const purchasePriceStr = optStr(formData, "purchasePrice");
  const purchaseDateStr = optStr(formData, "purchaseDate");

  await prisma.asset.create({
    data: {
      userId: user.id,
      name,
      type,
      purchaseDate: purchaseDateStr ? new Date(purchaseDateStr) : undefined,
      purchasePriceMinor: purchasePriceStr ? toMinorUnits(purchasePriceStr, currencyCode) : undefined,
      currentValueMinor: toMinorUnits(currentValueStr, currencyCode),
      currencyCode,
      lastValuationDate: new Date(),
      includeInNetWorth: formData.has("includeInNetWorth") ? checked(formData, "includeInNetWorth") : true,
      notes: optStr(formData, "notes"),
    },
  });

  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
}

export async function updateAsset(assetId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.asset.findFirstOrThrow({ where: { id: assetId, userId: user.id } });
  const currencyCode = optStr(formData, "currencyCode") ?? existing.currencyCode;

  const currentValueStr = optStr(formData, "currentValue");
  const purchasePriceStr = optStr(formData, "purchasePrice");
  const purchaseDateStr = optStr(formData, "purchaseDate");

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      name: str(formData, "name") || undefined,
      type: (optStr(formData, "type") as AssetType) ?? undefined,
      purchaseDate: purchaseDateStr ? new Date(purchaseDateStr) : undefined,
      purchasePriceMinor: purchasePriceStr ? toMinorUnits(purchasePriceStr, currencyCode) : undefined,
      currentValueMinor: currentValueStr ? toMinorUnits(currentValueStr, currencyCode) : undefined,
      currencyCode,
      lastValuationDate: currentValueStr ? new Date() : undefined,
      includeInNetWorth: formData.has("includeInNetWorth") ? checked(formData, "includeInNetWorth") : undefined,
      notes: optStr(formData, "notes"),
    },
  });

  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
}

export async function deleteAsset(assetId: string) {
  const user = await requireUser();
  await prisma.asset.deleteMany({ where: { id: assetId, userId: user.id } });
  revalidatePath("/assets");
  revalidatePath("/net-worth");
}
