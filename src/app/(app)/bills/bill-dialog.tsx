"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { createBill, updateBill } from "@/lib/actions/bill-actions";
import { BILL_FREQUENCIES, type BillFrequency } from "@/lib/types";
import { Plus } from "lucide-react";

export interface BillFormValues {
  id: string;
  name: string;
  categoryId?: string | null;
  amount: string;
  currencyCode: string;
  frequency: string;
  customIntervalDays?: number | null;
  accountId?: string | null;
  nextDueDate: string;
  autoPay: boolean;
  reminderDaysBefore: number;
  notes?: string | null;
}

export function BillDialog({
  categories,
  accounts,
  existing,
  trigger,
}: {
  categories: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  existing?: BillFormValues;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [frequency, setFrequency] = React.useState<BillFrequency>((existing?.frequency as BillFrequency) ?? "MONTHLY");

  const action = existing ? (fd: FormData) => updateBill(existing.id, fd) : (fd: FormData) => createBill(fd);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Bill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Bill" : "Add Bill"}</DialogTitle>
        </DialogHeader>
        <ActionForm action={action} onSuccess={() => setOpen(false)} successMessage={existing ? "Bill updated" : "Bill created"}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="name">Bill name</Label>
              <Input id="name" name="name" required defaultValue={existing?.name} placeholder="e.g. Meralco Electricity" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" inputMode="decimal" required defaultValue={existing?.amount} placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select name="categoryId" defaultValue={existing?.categoryId ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as BillFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILL_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="frequency" value={frequency} />
            </div>
            {frequency === "CUSTOM" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customIntervalDays">Every N days</Label>
                <Input id="customIntervalDays" name="customIntervalDays" type="number" min={1} defaultValue={existing?.customIntervalDays ?? ""} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nextDueDate">Next due date</Label>
              <Input id="nextDueDate" name="nextDueDate" type="date" required defaultValue={existing?.nextDueDate?.slice(0, 10)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Payment account</Label>
              <Select name="accountId" defaultValue={existing?.accountId ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reminderDaysBefore">Remind me (days before)</Label>
              <Input id="reminderDaysBefore" name="reminderDaysBefore" type="number" min={0} defaultValue={existing?.reminderDaysBefore ?? 3} />
            </div>
            <label className="flex items-center gap-2 text-sm mt-6">
              <Checkbox name="autoPay" defaultChecked={existing?.autoPay ?? false} />
              Auto-pay enabled
            </label>
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
