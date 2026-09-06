"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { recordReconciliation } from "@/lib/actions/account-actions";
import { ScanLine } from "lucide-react";

export function ReconcileDialog({ accountId }: { accountId: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ScanLine className="h-4 w-4" /> Reconcile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reconcile Account</DialogTitle>
        </DialogHeader>
        <ActionForm
          action={(fd) => recordReconciliation(accountId, fd)}
          onSuccess={() => setOpen(false)}
          successMessage="Reconciliation recorded"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="statementDate">Statement date</Label>
              <Input id="statementDate" name="statementDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="statementBalance">Statement ending balance</Label>
              <Input id="statementBalance" name="statementBalance" inputMode="decimal" required placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
