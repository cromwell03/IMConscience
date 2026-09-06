"use client";
import { humanize } from "@/lib/utils";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { createGoal, updateGoal } from "@/lib/actions/goal-actions";
import { GOAL_TYPES } from "@/lib/types";
import { Plus } from "lucide-react";

export interface GoalFormValues {
  id: string;
  name: string;
  type: string;
  targetAmount: string;
  currentAmount: string;
  currencyCode: string;
  targetDate?: string | null;
  monthlyContributionTarget?: string | null;
  linkedAccountId?: string | null;
  notes?: string | null;
}

export function GoalDialog({
  accounts,
  existing,
  trigger,
}: {
  accounts: { id: string; name: string }[];
  existing?: GoalFormValues;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const action = existing ? (fd: FormData) => updateGoal(existing.id, fd) : (fd: FormData) => createGoal(fd);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Goal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Goal" : "Add Goal"}</DialogTitle>
        </DialogHeader>
        <ActionForm action={action} onSuccess={() => setOpen(false)} successMessage={existing ? "Goal updated" : "Goal created"}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="name">Goal name</Label>
              <Input id="name" name="name" required defaultValue={existing?.name} placeholder="e.g. Emergency Fund" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select name="type" defaultValue={existing?.type ?? "EMERGENCY_FUND"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetAmount">Target amount</Label>
              <Input id="targetAmount" name="targetAmount" inputMode="decimal" required defaultValue={existing?.targetAmount} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentAmount">Current amount</Label>
              <Input id="currentAmount" name="currentAmount" inputMode="decimal" defaultValue={existing?.currentAmount ?? "0"} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monthlyContributionTarget">Monthly contribution target</Label>
              <Input id="monthlyContributionTarget" name="monthlyContributionTarget" inputMode="decimal" defaultValue={existing?.monthlyContributionTarget ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetDate">Target date</Label>
              <Input id="targetDate" name="targetDate" type="date" defaultValue={existing?.targetDate?.slice(0, 10)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Linked account (optional)</Label>
              <Select name="linkedAccountId" defaultValue={existing?.linkedAccountId ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} defaultValue={existing?.notes ?? ""} />
            </div>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
