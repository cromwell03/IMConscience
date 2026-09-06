"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { createAccount, updateAccount } from "@/lib/actions/account-actions";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, ACCOUNT_OWNERSHIPS, type AccountType } from "@/lib/types";
import { Plus } from "lucide-react";

export interface AccountFormValues {
  id: string;
  name: string;
  type: string;
  ownership: string;
  currencyCode: string;
  institutionId?: string | null;
  creditLimitMinor?: string | null;
  interestRateBps?: number | null;
  minimumPaymentMinor?: string | null;
  statementDay?: number | null;
  paymentDueDay?: number | null;
  lastFourDigits?: string | null;
  notes?: string | null;
  includeInNetWorth: boolean;
}

export function AccountDialog({
  institutions,
  currencies,
  existing,
  trigger,
}: {
  institutions: { id: string; name: string }[];
  currencies: string[];
  existing?: AccountFormValues;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<AccountType>((existing?.type as AccountType) ?? "CHECKING");
  const isCredit = type === "CREDIT_CARD" || type === "LOAN";

  const action = existing
    ? (fd: FormData) => updateAccount(existing.id, fd)
    : (fd: FormData) => createAccount(fd);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>
        <ActionForm action={action} onSuccess={() => setOpen(false)} successMessage={existing ? "Account updated" : "Account created"}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="name">Account name</Label>
              <Input id="name" name="name" defaultValue={existing?.name} required placeholder="e.g. BDO Savings" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select defaultValue={existing?.type ?? "CHECKING"} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="type" value={type} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Ownership</Label>
              <Select name="ownership" defaultValue={existing?.ownership ?? "PERSONAL"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_OWNERSHIPS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o === "PERSONAL" ? "Personal" : "Business"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Institution</Label>
              <Select name="institutionId" defaultValue={existing?.institutionId ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newInstitutionName">Or new institution</Label>
              <Input id="newInstitutionName" name="newInstitutionName" placeholder="e.g. BDO" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Currency</Label>
              <Select name="currencyCode" defaultValue={existing?.currencyCode ?? "PHP"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!existing && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="openingBalance">Opening balance</Label>
                <Input id="openingBalance" name="openingBalance" type="text" inputMode="decimal" placeholder="0.00" />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastFourDigits">Last 4 digits (optional)</Label>
              <Input id="lastFourDigits" name="lastFourDigits" maxLength={4} defaultValue={existing?.lastFourDigits ?? ""} placeholder="1234" />
            </div>

            {isCredit && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="creditLimit">Credit limit</Label>
                  <Input id="creditLimit" name="creditLimit" inputMode="decimal" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="interestRate">Interest rate (% APR)</Label>
                  <Input id="interestRate" name="interestRate" inputMode="decimal" placeholder="24.00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="minimumPayment">Minimum payment</Label>
                  <Input id="minimumPayment" name="minimumPayment" inputMode="decimal" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="originalBalance">Original balance (loans)</Label>
                  <Input id="originalBalance" name="originalBalance" inputMode="decimal" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="statementDay">Statement day</Label>
                  <Input id="statementDay" name="statementDay" type="number" min={1} max={31} defaultValue={existing?.statementDay ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="paymentDueDay">Payment due day</Label>
                  <Input id="paymentDueDay" name="paymentDueDay" type="number" min={1} max={31} defaultValue={existing?.paymentDueDay ?? ""} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="termMonths">Term (months)</Label>
                  <Input id="termMonths" name="termMonths" type="number" min={1} />
                </div>
              </>
            )}

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={existing?.notes ?? ""} rows={2} />
            </div>

            <label className="col-span-2 flex items-center gap-2 text-sm">
              <Checkbox name="includeInNetWorth" defaultChecked={existing?.includeInNetWorth ?? true} />
              Include in net worth
            </label>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
