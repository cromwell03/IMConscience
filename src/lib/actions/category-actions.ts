"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { CATEGORY_KINDS, type CategoryKind } from "@/lib/types";
import { str, optStr, ActionError } from "./form-utils";

export async function createCategory(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  const kind = str(formData, "kind") as CategoryKind;
  const parentId = optStr(formData, "parentId");

  if (!name) throw new ActionError("Category name is required.");
  if (!CATEGORY_KINDS.includes(kind)) throw new ActionError("Invalid category kind.");

  const existing = await prisma.category.findFirst({ where: { userId: user.id, name, parentId: parentId ?? null } });
  if (existing) throw new ActionError("A category with this name already exists at this level.");

  await prisma.category.create({
    data: {
      userId: user.id,
      name,
      kind,
      parentId,
      color: optStr(formData, "color"),
      icon: optStr(formData, "icon"),
    },
  });

  revalidatePath("/settings/categories");
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const user = await requireUser();
  await prisma.category.findFirstOrThrow({ where: { id: categoryId, userId: user.id } });

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      name: str(formData, "name") || undefined,
      color: optStr(formData, "color"),
      icon: optStr(formData, "icon"),
    },
  });

  revalidatePath("/settings/categories");
}

export async function archiveCategory(categoryId: string) {
  const user = await requireUser();
  await prisma.category.updateMany({ where: { id: categoryId, userId: user.id }, data: { isActive: false } });
  revalidatePath("/settings/categories");
}

export async function deleteCategory(categoryId: string) {
  const user = await requireUser();
  await prisma.category.findFirstOrThrow({ where: { id: categoryId, userId: user.id } });

  const [txCount, childCount, budgetCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId } }),
    prisma.category.count({ where: { parentId: categoryId } }),
    prisma.budget.count({ where: { categoryId } }),
  ]);

  if (txCount > 0 || budgetCount > 0) {
    throw new ActionError("This category is used by transactions or budgets. Archive it instead of deleting.");
  }
  if (childCount > 0) {
    throw new ActionError("Delete or reassign its subcategories first.");
  }

  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/settings/categories");
}
