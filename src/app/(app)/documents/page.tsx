import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { UploadDialog } from "./upload-dialog";
import { deleteDocument } from "@/lib/actions/document-actions";
import { format } from "date-fns";
import { FileText, Download, Trash2 } from "lucide-react";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Documents — Personal Finance OS" };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const user = await requireUser();
  const [documents, accounts] = await Promise.all([
    prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { uploadedAt: "desc" },
      include: { linkedAccount: true, linkedAsset: true, linkedBill: true },
    }),
    prisma.account.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Documents" description="Bank statements, receipts, policies, and other financial records." actions={<UploadDialog accounts={accounts} />} />

      {documents.length === 0 ? (
        <EmptyState title="No documents yet" description="Upload statements, receipts, or policies and optionally link them to an account." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted shrink-0">
                    <FileText className="h-4.5 w-4.5 text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <p className="text-xs text-muted">
                      {formatBytes(doc.sizeBytes)} · {format(doc.uploadedAt, "MMM d, yyyy")}
                    </p>
                    <Badge tone="neutral" className="mt-1.5">
                      {humanize(doc.documentType)}
                    </Badge>
                    {doc.linkedAccount && <p className="mt-1 text-xs text-muted">Linked: {doc.linkedAccount.name}</p>}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <a
                    href={`/api/documents/${doc.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded p-1.5 text-xs text-muted hover:bg-surface-muted hover:text-foreground"
                  >
                    <Download className="h-4 w-4" /> Open
                  </a>
                  <ConfirmActionButton
                    variant="ghost"
                    size="icon"
                    action={deleteDocument.bind(null, doc.id)}
                    confirmMessage={`Delete "${doc.filename}"? This cannot be undone.`}
                  >
                    <Trash2 className="h-4 w-4 text-muted" />
                  </ConfirmActionButton>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
