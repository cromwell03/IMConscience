"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TransactionDialog, type AccountOption, type CategoryOption, type TransactionFormValues } from "./transaction-dialog";
import { bulkCategorize, bulkDeleteTransactions, deleteTransaction } from "@/lib/actions/transaction-actions";
import { getTransactionDisplay } from "@/lib/tx-display";
import { TRANSACTION_TYPE_LABELS, type AccountType } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";

export interface TxRow {
  id: string;
  date: string;
  description: string;
  payee: string | null;
  amountMinor: string;
  amountDisplay: string;
  currencyCode: string;
  type: string;
  sourceAccountId: string;
  sourceAccountName: string;
  sourceAccountType: string;
  destinationAccountId: string | null;
  destinationAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  businessTransferSubtype: string | null;
  notes: string | null;
  reconciled: boolean;
  isSplit: boolean;
}

export function TransactionsTable({
  rows,
  accounts,
  categories,
}: {
  rows: TxRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selected.size} transaction(s)? This can't be undone.`)) return;
    setPending(true);
    try {
      await bulkDeleteTransactions(Array.from(selected));
      toast.success(`${selected.size} transaction(s) deleted`);
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setPending(false);
    }
  }

  async function handleBulkCategorize() {
    if (!bulkCategoryId) return;
    setPending(true);
    try {
      await bulkCategorize(Array.from(selected), bulkCategoryId);
      toast.success(`${selected.size} transaction(s) categorized`);
      setSelected(new Set());
      setBulkCategoryId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to categorize");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      toast.success("Transaction deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
            <SelectTrigger className="h-8 w-48">
              <SelectValue placeholder="Categorize as…" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={!bulkCategoryId || pending} onClick={handleBulkCategorize}>
            Apply
          </Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete selected
          </Button>
          <button className="ml-auto text-xs text-muted hover:underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tx) => {
            const display = getTransactionDisplay(
              {
                type: tx.type,
                amountMinor: BigInt(tx.amountMinor),
                destinationAccountId: tx.destinationAccountId,
                businessTransferSubtype: tx.businessTransferSubtype,
              },
              tx.sourceAccountId,
              tx.sourceAccountId,
              tx.sourceAccountType as AccountType
            );
            return (
              <TableRow key={tx.id} className={!tx.categoryId && !tx.isSplit && (tx.type === "EXPENSE" || tx.type === "INCOME") ? "bg-warning/5" : ""}>
                <TableCell>
                  <Checkbox checked={selected.has(tx.id)} onCheckedChange={() => toggleOne(tx.id)} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{format(new Date(tx.date), "MMM d, yyyy")}</TableCell>
                <TableCell className="max-w-[240px]">
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  {tx.payee && <p className="truncate text-xs text-muted">{tx.payee}</p>}
                </TableCell>
                <TableCell className="text-sm text-muted whitespace-nowrap">
                  {tx.sourceAccountName}
                  {tx.destinationAccountName ? ` → ${tx.destinationAccountName}` : ""}
                </TableCell>
                <TableCell>
                  <Badge tone="neutral">{TRANSACTION_TYPE_LABELS[tx.type as keyof typeof TRANSACTION_TYPE_LABELS] ?? tx.type}</Badge>
                  {tx.reconciled && <Badge tone="positive" className="ml-1">✓</Badge>}
                </TableCell>
                <TableCell className="text-sm">
                  {tx.isSplit ? (
                    <span className="text-muted italic">Split</span>
                  ) : tx.categoryName ? (
                    tx.categoryName
                  ) : tx.type === "EXPENSE" || tx.type === "INCOME" || tx.type === "REFUND" ? (
                    <span className="text-warning">Uncategorized</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Money amountMinor={display.amountMinor} currencyCode={tx.currencyCode} colorize={display.colorize} signed />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TransactionDialog
                      accounts={accounts}
                      categories={categories}
                      existing={
                        {
                          id: tx.id,
                          date: tx.date.slice(0, 10),
                          description: tx.description,
                          payee: tx.payee,
                          amount: tx.amountDisplay,
                          type: tx.type,
                          sourceAccountId: tx.sourceAccountId,
                          destinationAccountId: tx.destinationAccountId,
                          categoryId: tx.categoryId,
                          businessTransferSubtype: tx.businessTransferSubtype,
                          notes: tx.notes,
                          reconciled: tx.reconciled,
                        } satisfies TransactionFormValues
                      }
                      trigger={
                        <button className="rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                    <button onClick={() => handleDelete(tx.id)} className="rounded p-1 text-muted hover:bg-surface-muted hover:text-negative">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.length === 0 && <p className="py-10 text-center text-sm text-muted">No transactions match these filters.</p>}
    </div>
  );
}
