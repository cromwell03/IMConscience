import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { RuleDialog } from "./rule-dialog";
import { deleteRule } from "@/lib/actions/settings-actions";
import { TRANSACTION_TYPE_LABELS, type TransactionType } from "@/lib/types";
import { Trash2 } from "lucide-react";

export const metadata = { title: "Categorization Rules — Settings" };

export default async function RulesSettingsPage() {
  const user = await requireUser();
  const [rules, categories] = await Promise.all([
    prisma.categorizationRule.findMany({ where: { userId: user.id }, include: { category: true }, orderBy: { priority: "desc" } }),
    prisma.category.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <RuleDialog categories={categories} />
      </div>
      <Card>
        <CardContent className="pt-5">
          <p className="text-xs text-muted mb-3">
            Rules run highest-priority first and apply automatically to new transactions and imports. They never modify already-reconciled
            transactions.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>If</TableHead>
                <TableHead>Then</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell className="text-sm">
                    {rule.matchField} {rule.matchType.toLowerCase()} <Badge tone="neutral">{rule.matchValue}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {rule.category && <>Category → {rule.category.name} </>}
                    {rule.setType && <>Type → {TRANSACTION_TYPE_LABELS[rule.setType as TransactionType]}</>}
                  </TableCell>
                  <TableCell>
                    <ConfirmActionButton variant="ghost" size="icon" action={deleteRule.bind(null, rule.id)} confirmMessage="Delete this rule?">
                      <Trash2 className="h-4 w-4 text-muted" />
                    </ConfirmActionButton>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted py-6">
                    No rules yet. Add one to auto-categorize future transactions.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
