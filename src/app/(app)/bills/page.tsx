import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { BillDialog } from "./bill-dialog";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { deleteBill } from "@/lib/actions/bill-actions";
import { formatMinorUnits } from "@/lib/money";
import { format, isBefore, addDays } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Bills — Personal Finance OS" };

export default async function BillsPage() {
  const user = await requireUser();
  const [bills, categories, accounts] = await Promise.all([
    prisma.bill.findMany({ where: { userId: user.id }, orderBy: { nextDueDate: "asc" }, include: { category: true, account: true } }),
    prisma.category.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Bills & Recurring Payments"
        description="Everything that recurs — utilities, subscriptions, loan payments, renewals."
        actions={<BillDialog categories={categories} accounts={accounts} />}
      />

      {bills.length === 0 ? (
        <EmptyState title="No bills yet" description="Add recurring bills to see them on your dashboard and get reminders." />
      ) : (
        <div className="flex flex-col gap-3">
          {bills.map((bill) => {
            const overdue = isBefore(bill.nextDueDate, now);
            const dueSoon = !overdue && isBefore(bill.nextDueDate, addDays(now, bill.reminderDaysBefore));
            const status = overdue ? "OVERDUE" : dueSoon ? "DUE_SOON" : "SCHEDULED";
            return (
              <Card key={bill.id} className={!bill.isActive ? "opacity-60" : ""}>
                <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{bill.name}</p>
                      <Badge tone={status === "OVERDUE" ? "negative" : status === "DUE_SOON" ? "warning" : "neutral"}>
                        {humanize(status)}
                      </Badge>
                      {bill.autoPay && <Badge tone="info">Auto-pay</Badge>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {bill.category?.name ?? "Uncategorized"} · {bill.frequency.charAt(0) + bill.frequency.slice(1).toLowerCase()} · Due{" "}
                      {format(bill.nextDueDate, "MMM d, yyyy")}
                      {bill.account ? ` · ${bill.account.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Money amountMinor={bill.amountMinor} currencyCode={bill.currencyCode} className="text-base font-semibold mr-2" />
                    <MarkPaidDialog
                      billId={bill.id}
                      defaultAmount={formatMinorUnits(bill.amountMinor, bill.currencyCode)}
                      accounts={accounts}
                      defaultAccountId={bill.accountId}
                    />
                    <BillDialog
                      categories={categories}
                      accounts={accounts}
                      existing={{
                        id: bill.id,
                        name: bill.name,
                        categoryId: bill.categoryId,
                        amount: formatMinorUnits(bill.amountMinor, bill.currencyCode),
                        currencyCode: bill.currencyCode,
                        frequency: bill.frequency,
                        customIntervalDays: bill.customIntervalDays,
                        accountId: bill.accountId,
                        nextDueDate: bill.nextDueDate.toISOString(),
                        autoPay: bill.autoPay,
                        reminderDaysBefore: bill.reminderDaysBefore,
                        notes: bill.notes,
                      }}
                      trigger={
                        <button className="rounded p-1.5 text-muted hover:bg-surface-muted hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                      }
                    />
                    <ConfirmActionButton
                      variant="ghost"
                      size="icon"
                      action={deleteBill.bind(null, bill.id)}
                      confirmMessage={`Delete "${bill.name}"?`}
                      successMessage="Bill deleted"
                    >
                      <Trash2 className="h-4 w-4 text-muted" />
                    </ConfirmActionButton>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
