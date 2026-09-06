import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ImportWizard } from "./import-wizard";

export const metadata = { title: "Import Transactions — Personal Finance OS" };

export default async function ImportPage() {
  const user = await requireUser();
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Import Transactions" description="Bring in transactions from a bank or card CSV/Excel export." />
      <ImportWizard
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, currencyCode: a.currencyCode }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind as "INCOME" | "EXPENSE" }))}
      />
    </div>
  );
}
