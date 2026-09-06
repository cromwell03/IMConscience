"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/types";
import { STORAGE_ROOT } from "@/lib/storage";
import { optStr, ActionError } from "./form-utils";

export async function uploadDocument(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ActionError("Choose a file to upload.");
  }

  const documentType = (optStr(formData, "documentType") as DocumentType) ?? "OTHER";
  if (!DOCUMENT_TYPES.includes(documentType)) throw new ActionError("Invalid document type.");

  const userDir = path.join(STORAGE_ROOT, user.id);
  await mkdir(userDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${randomUUID()}-${safeName}`;
  const storagePath = path.join(userDir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  await prisma.document.create({
    data: {
      userId: user.id,
      filename: file.name,
      storagePath: path.join(user.id, storedName),
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      documentType,
      notes: optStr(formData, "notes"),
      linkedAccountId: optStr(formData, "linkedAccountId"),
      linkedTransactionId: optStr(formData, "linkedTransactionId"),
      linkedAssetId: optStr(formData, "linkedAssetId"),
      linkedBillId: optStr(formData, "linkedBillId"),
    },
  });

  revalidatePath("/documents");
}

export async function deleteDocument(documentId: string) {
  const user = await requireUser();
  const doc = await prisma.document.findFirstOrThrow({ where: { id: documentId, userId: user.id } });

  await prisma.document.delete({ where: { id: documentId } });
  try {
    await unlink(path.join(STORAGE_ROOT, doc.storagePath));
  } catch {
    // file already gone — nothing more to clean up
  }

  revalidatePath("/documents");
}
