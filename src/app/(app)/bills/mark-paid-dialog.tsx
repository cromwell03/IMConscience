"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { markBillPaid } from "@/lib/actions/bill-actions";
import { CheckCircle2 } from "lucide-react";

export function MarkPaidDialog({
  billId,
  defaultAmount,
  accounts,
  defaultAccountId,
}: {
  billId: string;
  defaultAmount: string;
  accounts: { id: string; name: string }[];
  defaultAccountId?: string | null;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckCircle2 className="h-4 w-4" /> Mark Paid
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Bill Paid</DialogTitle>
        </DialogHeader>
        <ActionForm action={(fd) => markBillPaid(billId, fd)} onSuccess={() => setOpen(false)} successMessage="Bill marked paid">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paidDate">Paid date</Label>
              <Input id="paidDate" name="paidDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount paid</Label>
              <Input id="amount" name="amount" inputMode="decimal" defaultValue={defaultAmount} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>From account</Label>
              <Select name="accountId" defaultValue={defaultAccountId ?? undefined}>
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
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
