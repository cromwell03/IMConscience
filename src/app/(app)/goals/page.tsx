import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/money";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { GoalDialog } from "./goal-dialog";
import { deleteGoal } from "@/lib/actions/goal-actions";
import { formatMinorUnits, percentOf } from "@/lib/money";
import { format, addMonths } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Goals — Personal Finance OS" };

export default async function GoalsPage() {
  const user = await requireUser();
  const [goals, accounts] = await Promise.all([
    prisma.goal.findMany({ where: { userId: user.id }, include: { linkedAccount: true }, orderBy: { createdAt: "desc" } }),
    prisma.account.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Goals" description="Emergency fund, travel, big purchases — track progress toward what matters." actions={<GoalDialog accounts={accounts} />} />

      {goals.length === 0 ? (
        <EmptyState title="No goals yet" description="Set a savings goal and track your progress toward it." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const current = goal.linkedAccount ? goal.linkedAccount.currentBalanceMinor : goal.currentAmountMinor;
            const pct = percentOf(current, goal.targetAmountMinor) ?? 0;
            const remaining = goal.targetAmountMinor - current;
            const monthsNeeded =
              goal.monthlyContributionTargetMinor && goal.monthlyContributionTargetMinor > 0n && remaining > 0n
                ? Math.ceil(Number(remaining) / Number(goal.monthlyContributionTargetMinor))
                : null;
            const estimatedDate = monthsNeeded !== null ? addMonths(new Date(), monthsNeeded) : null;

            return (
              <Card key={goal.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{goal.name}</p>
                      <p className="text-xs text-muted">{humanize(goal.type)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-sm">
                      <Money amountMinor={current} currencyCode={goal.currencyCode} className="font-semibold" />
                      <span className="text-muted">of <Money amountMinor={goal.targetAmountMinor} currencyCode={goal.currencyCode} /></span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted">{pct.toFixed(0)}% funded</p>
                  </div>
                  {goal.targetDate && <p className="mt-2 text-xs text-muted">Target date: {format(goal.targetDate, "MMM d, yyyy")}</p>}
                  {estimatedDate && <p className="text-xs text-muted">At current pace: ~{format(estimatedDate, "MMM yyyy")}</p>}
                  {goal.linkedAccount && <p className="text-xs text-muted">Linked to {goal.linkedAccount.name}</p>}
                  <div className="mt-3 flex items-center gap-1">
                    <GoalDialog
                      accounts={accounts}
                      existing={{
                        id: goal.id,
                        name: goal.name,
                        type: goal.type,
                        targetAmount: formatMinorUnits(goal.targetAmountMinor, goal.currencyCode),
                        currentAmount: formatMinorUnits(goal.currentAmountMinor, goal.currencyCode),
                        currencyCode: goal.currencyCode,
                        targetDate: goal.targetDate?.toISOString(),
                        monthlyContributionTarget: goal.monthlyContributionTargetMinor
                          ? formatMinorUnits(goal.monthlyContributionTargetMinor, goal.currencyCode)
                          : "",
                        linkedAccountId: goal.linkedAccountId,
                        notes: goal.notes,
                      }}
                      trigger={
                        <button className="rounded p-1.5 text-muted hover:bg-surface-muted hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                      }
                    />
                    <ConfirmActionButton variant="ghost" size="icon" action={deleteGoal.bind(null, goal.id)} confirmMessage={`Delete "${goal.name}"?`}>
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
