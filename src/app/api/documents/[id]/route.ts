import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STORAGE_ROOT } from "@/lib/storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const doc = await prisma.document.findFirst({ where: { id, userId: user.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const buffer = await readFile(path.join(STORAGE_ROOT, doc.storagePath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }
}
