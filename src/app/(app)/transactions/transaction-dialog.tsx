"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { createTransaction, updateTransaction } from "@/lib/actions/transaction-actions";
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  TRANSFER_LIKE_TYPES,
  BUSINESS_TRANSFER_SUBTYPES,
  BUSINESS_TRANSFER_SUBTYPE_LABELS,
  type TransactionType,
} from "@/lib/types";
import { Plus, X } from "lucide-react";

export interface AccountOption {
  id: string;
  name: string;
  currencyCode: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
}

export interface TransactionFormValues {
  id: string;
  date: string;
  description: string;
  payee?: string | null;
  amount: string;
  type: string;
  sourceAccountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  businessTransferSubtype?: string | null;
  notes?: string | null;
  reconciled: boolean;
}

interface SplitRow {
  categoryId: string;
  amount: string;
}

export function TransactionDialog({
  accounts,
  categories,
  existing,
  defaultAccountId,
  trigger,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  existing?: TransactionFormValues;
  defaultAccountId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<TransactionType>((existing?.type as TransactionType) ?? "EXPENSE");
  const [sourceAccountId, setSourceAccountId] = React.useState(existing?.sourceAccountId ?? defaultAccountId ?? accounts[0]?.id ?? "");
  const [destinationAccountId, setDestinationAccountId] = React.useState(existing?.destinationAccountId ?? "");
  const [splitting, setSplitting] = React.useState(false);
  const [splits, setSplits] = React.useState<SplitRow[]>([{ categoryId: "", amount: "" }]);

  const isTransferLike = TRANSFER_LIKE_TYPES.includes(type);
  const isBusiness = type === "BUSINESS_TRANSFER";
  const sourceAccount = accounts.find((a) => a.id === sourceAccountId);
  const destAccount = accounts.find((a) => a.id === destinationAccountId);
  const needsDestAmount = isTransferLike && destAccount && sourceAccount && destAccount.currencyCode !== sourceAccount.currencyCode;

  const relevantCategories = categories.filter((c) => (type === "INCOME" || type === "REFUND" ? c.kind === "INCOME" : c.kind === "EXPENSE"));

  const action = existing ? (fd: FormData) => updateTransaction(existing.id, fd) : (fd: FormData) => createTransaction(fd);

  function updateSplit(i: number, field: keyof SplitRow, value: string) {
    setSplits((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>
        <ActionForm action={action} onSuccess={() => setOpen(false)} successMessage={existing ? "Transaction updated" : "Transaction added"}>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRANSACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="type" value={type} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" required defaultValue={existing?.date ?? new Date().toISOString().slice(0, 10)} />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" required defaultValue={existing?.description} placeholder="e.g. SM Supermarket groceries" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payee">Merchant / Payee</Label>
              <Input id="payee" name="payee" defaultValue={existing?.payee ?? ""} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount {sourceAccount ? `(${sourceAccount.currencyCode})` : ""}</Label>
              <Input id="amount" name="amount" inputMode="decimal" required defaultValue={existing?.amount} placeholder="0.00" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{isTransferLike ? "From Account" : "Account"}</Label>
              <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="sourceAccountId" value={sourceAccountId} />
            </div>

            {isTransferLike && (
              <div className="flex flex-col gap-1.5">
                <Label>To Account{isBusiness ? " (optional, if tracked here)" : ""}</Label>
                <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== sourceAccountId)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="destinationAccountId" value={destinationAccountId} />
              </div>
            )}

            {needsDestAmount && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="destinationAmount">Amount received ({destAccount?.currencyCode})</Label>
                <Input id="destinationAmount" name="destinationAmount" inputMode="decimal" required placeholder="0.00" />
              </div>
            )}

            {isBusiness && (
              <div className="flex flex-col gap-1.5 col-span-2">
                <Label>Business Transfer Type</Label>
                <Select name="businessTransferSubtype" defaultValue={existing?.businessTransferSubtype ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subtype" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TRANSFER_SUBTYPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {BUSINESS_TRANSFER_SUBTYPE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isTransferLike && !splitting && (
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select name="categoryId" defaultValue={existing?.categoryId ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    {relevantCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isTransferLike && (type === "EXPENSE" || type === "INCOME") && (
              <div className="col-span-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <Checkbox checked={splitting} onCheckedChange={(c) => setSplitting(!!c)} />
                  Split across multiple categories
                </label>
              </div>
            )}

            {splitting && (
              <div className="col-span-2 flex flex-col gap-2 rounded-md border border-border p-3">
                {splits.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={s.categoryId} onValueChange={(v) => updateSplit(i, "categoryId", v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {relevantCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-28"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={s.amount}
                      onChange={(e) => updateSplit(i, "amount", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setSplits((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted hover:text-negative"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSplits((prev) => [...prev, { categoryId: "", amount: "" }])}
                  className="self-start text-xs font-medium text-accent hover:underline"
                >
                  + Add split
                </button>
                <input
                  type="hidden"
                  name="splitsJson"
                  value={JSON.stringify(splits.filter((s) => s.categoryId && s.amount))}
                />
              </div>
            )}

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="tagsCsv">Tags (comma-separated)</Label>
              <Input id="tagsCsv" name="tagsCsv" placeholder="e.g. vacation, tax-deductible" />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={existing?.notes ?? ""} rows={2} />
            </div>

            <label className="col-span-2 flex items-center gap-2 text-sm">
              <Checkbox name="reconciled" defaultChecked={existing?.reconciled ?? false} />
              Reconciled
            </label>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
