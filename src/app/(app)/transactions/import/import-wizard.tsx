"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { parseCsvText, parseExcelBuffer, guessColumnMapping, normalizeRows, type ColumnMapping, type NormalizedImportRow } from "@/lib/import";
import { getSavedMapping, analyzeImportRows, commitImport, type AnalyzedImportRow, type CommitImportRow } from "@/lib/actions/import-actions";
import { toMinorUnits } from "@/lib/money";

interface AccountOption {
  id: string;
  name: string;
  currencyCode: string;
}
interface CategoryOption {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
}

type Step = "select" | "map" | "review";

interface ReviewRow extends AnalyzedImportRow {
  include: boolean;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
}

export function ImportWizard({ accounts, categories }: { accounts: AccountOption[]; categories: CategoryOption[] }) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("select");
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [file, setFile] = React.useState<File | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rawRows, setRawRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<Partial<ColumnMapping>>({});
  const [reviewRows, setReviewRows] = React.useState<ReviewRow[]>([]);
  const [busy, setBusy] = React.useState(false);

  const account = accounts.find((a) => a.id === accountId);

  async function handleFileSelected(f: File) {
    setFile(f);
    let parsed;
    if (f.name.endsWith(".csv") || f.type === "text/csv") {
      const text = await f.text();
      parsed = parseCsvText(text);
    } else {
      const buffer = await f.arrayBuffer();
      parsed = parseExcelBuffer(buffer);
    }
    setHeaders(parsed.headers);
    setRawRows(parsed.rows);

    const saved = await getSavedMapping(accountId);
    setMapping(saved ?? guessColumnMapping(parsed.headers));
    setStep("map");
  }

  async function handleAnalyze() {
    if (mapping.dateColumn === undefined || mapping.descriptionColumn === undefined) {
      toast.error("Map at least the Date and Description columns.");
      return;
    }
    setBusy(true);
    try {
      const normalized = normalizeRows(rawRows, mapping as ColumnMapping).filter((r): r is NormalizedImportRow => r !== null);
      if (normalized.length === 0) {
        toast.error("No valid rows found with this column mapping.");
        return;
      }
      const analyzed = await analyzeImportRows(accountId, normalized);
      setReviewRows(
        analyzed.map((r) => ({
          ...r,
          include: !r.isDuplicate,
          type: r.suggestedType,
          categoryId: r.suggestedCategoryId,
        }))
      );
      setStep("review");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    setBusy(true);
    try {
      const rows: CommitImportRow[] = reviewRows.map((r) => ({
        date: r.date,
        description: r.description,
        payee: r.payee,
        amount: r.amount,
        type: r.type,
        categoryId: r.categoryId,
        include: r.include,
      }));
      const result = await commitImport(accountId, rows, file?.name ?? "import", mapping as ColumnMapping);
      toast.success(`Imported ${result.imported} transaction(s).`);
      router.push("/transactions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const includedCount = reviewRows.filter((r) => r.include).length;
  const relevantCategories = categories;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <StepBadge active={step === "select"} done={step !== "select"} label="1. Select" />
        <StepBadge active={step === "map"} done={step === "review"} label="2. Map columns" />
        <StepBadge active={step === "review"} done={false} label="3. Review & confirm" />
      </div>

      {step === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>Select account and file</CardTitle>
            <CardDescription>Choose which account these transactions belong to, then upload a CSV or Excel export.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 max-w-xs">
              <label className="text-xs font-medium text-muted">Account</label>
              <Select value={accountId} onValueChange={setAccountId}>
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
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted">File (.csv, .xlsx, .xls)</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Map columns</CardTitle>
            <CardDescription>
              {rawRows.length} rows detected in {file?.name}. Confirm which columns hold what.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ColumnPicker label="Date" headers={headers} value={mapping.dateColumn} onChange={(v) => setMapping((m) => ({ ...m, dateColumn: v }))} />
              <ColumnPicker
                label="Description"
                headers={headers}
                value={mapping.descriptionColumn}
                onChange={(v) => setMapping((m) => ({ ...m, descriptionColumn: v }))}
              />
              <ColumnPicker label="Payee (optional)" headers={headers} value={mapping.payeeColumn} onChange={(v) => setMapping((m) => ({ ...m, payeeColumn: v }))} />
              <ColumnPicker
                label="Amount (signed)"
                headers={headers}
                value={mapping.amountColumn}
                onChange={(v) => setMapping((m) => ({ ...m, amountColumn: v, debitColumn: undefined, creditColumn: undefined }))}
              />
              <ColumnPicker
                label="Or: Debit column"
                headers={headers}
                value={mapping.debitColumn}
                onChange={(v) => setMapping((m) => ({ ...m, debitColumn: v, amountColumn: undefined }))}
              />
              <ColumnPicker
                label="Or: Credit column"
                headers={headers}
                value={mapping.creditColumn}
                onChange={(v) => setMapping((m) => ({ ...m, creditColumn: v, amountColumn: undefined }))}
              />
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, i) => (
                      <TableHead key={i}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawRows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell key={j} className="text-xs">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button onClick={handleAnalyze} disabled={busy}>
                {busy ? "Analyzing…" : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && account && (
        <Card>
          <CardHeader>
            <CardTitle>Review {reviewRows.length} rows</CardTitle>
            <CardDescription>
              {includedCount} selected for import. Duplicates are unchecked by default — review before including them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewRows.map((row, i) => (
                    <TableRow key={i} className={row.isDuplicate ? "bg-warning/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={row.include}
                          onCheckedChange={(c) =>
                            setReviewRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, include: !!c } : r)))
                          }
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{row.date}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs">{row.description}</TableCell>
                      <TableCell className="text-right text-xs">
                        <Money amountMinor={toMinorUnits(Math.abs(row.amount).toString(), account.currencyCode)} currencyCode={account.currencyCode} />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.type}
                          onValueChange={(v) => setReviewRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, type: v as "INCOME" | "EXPENSE" } : r)))}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INCOME">Income</SelectItem>
                            <SelectItem value="EXPENSE">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.categoryId ?? undefined}
                          onValueChange={(v) => setReviewRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, categoryId: v } : r)))}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue placeholder="Uncategorized" />
                          </SelectTrigger>
                          <SelectContent>
                            {relevantCategories
                              .filter((c) => c.kind === row.type)
                              .map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {row.isDuplicate && <Badge tone="warning">Possible duplicate</Badge>}
                        {!row.categoryId && <Badge tone="neutral">Uncategorized</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={handleCommit} disabled={busy || includedCount === 0}>
                {busy ? "Importing…" : `Import ${includedCount} transaction(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepBadge({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 ${active ? "bg-accent text-accent-foreground font-medium" : done ? "bg-positive/10 text-positive" : "bg-surface-muted"}`}>
      {label}
    </span>
  );
}

function ColumnPicker({
  label,
  headers,
  value,
  onChange,
}: {
  label: string;
  headers: string[];
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      <Select value={value !== undefined ? String(value) : undefined} onValueChange={(v) => onChange(v === "none" ? undefined : Number(v))}>
        <SelectTrigger>
          <SelectValue placeholder="Not mapped" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not mapped</SelectItem>
          {headers.map((h, i) => (
            <SelectItem key={i} value={String(i)}>
              {h || `Column ${i + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
