// Client-safe CSV/Excel parsing helpers for the transaction import wizard.
import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

export function parseCsvText(text: string): ParsedSheet {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const data = result.data as string[][];
  if (data.length === 0) return { headers: [], rows: [] };
  return { headers: data[0], rows: data.slice(1) };
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
  const rows = data.filter((r) => r.some((cell) => String(cell).trim() !== ""));
  if (rows.length === 0) return { headers: [], rows: [] };
  return { headers: rows[0].map(String), rows: rows.slice(1).map((r) => r.map(String)) };
}

export interface ColumnMapping {
  dateColumn: number;
  descriptionColumn: number;
  payeeColumn?: number;
  // Either a single signed amount column, or separate debit/credit columns.
  amountColumn?: number;
  debitColumn?: number;
  creditColumn?: number;
}

const DATE_HINTS = ["date", "posted", "transaction date"];
const DESCRIPTION_HINTS = ["description", "memo", "details", "narrative", "particulars"];
const PAYEE_HINTS = ["payee", "merchant", "name"];
const AMOUNT_HINTS = ["amount", "value"];
const DEBIT_HINTS = ["debit", "withdrawal", "out"];
const CREDIT_HINTS = ["credit", "deposit", "in"];

function findColumn(headers: string[], hints: string[]): number | undefined {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h.includes(hint));
    if (idx !== -1) return idx;
  }
  return undefined;
}

export function guessColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const amountColumn = findColumn(headers, AMOUNT_HINTS);
  const debitColumn = findColumn(headers, DEBIT_HINTS);
  const creditColumn = findColumn(headers, CREDIT_HINTS);

  return {
    dateColumn: findColumn(headers, DATE_HINTS),
    descriptionColumn: findColumn(headers, DESCRIPTION_HINTS),
    payeeColumn: findColumn(headers, PAYEE_HINTS),
    amountColumn: amountColumn !== undefined && debitColumn === undefined ? amountColumn : undefined,
    debitColumn,
    creditColumn,
  } as Partial<ColumnMapping>;
}

export interface NormalizedImportRow {
  rowIndex: number;
  date: string; // ISO date
  description: string;
  payee?: string;
  amount: number; // major units, signed (negative = money out)
}

function parseDateLoose(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoAttempt = new Date(trimmed);
  if (!Number.isNaN(isoAttempt.getTime())) return isoAttempt.toISOString().slice(0, 10);
  // Try common "MM/DD/YYYY" or "DD/MM/YYYY" — prefer MM/DD/YYYY (US bank exports).
  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const year = c.length === 4 ? c : `20${c}`;
    const month = a.padStart(2, "0");
    const day = b.padStart(2, "0");
    const d = new Date(`${year}-${month}-${day}`);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseAmountLoose(value: string): number | null {
  const cleaned = value.replace(/[^\d.\-()]/g, "");
  if (cleaned === "") return null;
  const negative = value.trim().startsWith("(") && value.trim().endsWith(")");
  const n = Number.parseFloat(cleaned.replace(/[()]/g, ""));
  if (Number.isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}

export function normalizeRows(rows: string[][], mapping: ColumnMapping): (NormalizedImportRow | null)[] {
  return rows.map((row, rowIndex) => {
    const dateRaw = row[mapping.dateColumn] ?? "";
    const date = parseDateLoose(dateRaw);
    const description = (row[mapping.descriptionColumn] ?? "").trim();
    const payee = mapping.payeeColumn !== undefined ? row[mapping.payeeColumn]?.trim() : undefined;

    let amount: number | null = null;
    if (mapping.amountColumn !== undefined) {
      amount = parseAmountLoose(row[mapping.amountColumn] ?? "");
    } else if (mapping.debitColumn !== undefined || mapping.creditColumn !== undefined) {
      const debit = mapping.debitColumn !== undefined ? parseAmountLoose(row[mapping.debitColumn] ?? "") : null;
      const credit = mapping.creditColumn !== undefined ? parseAmountLoose(row[mapping.creditColumn] ?? "") : null;
      if (debit && debit !== 0) amount = -Math.abs(debit);
      else if (credit && credit !== 0) amount = Math.abs(credit);
    }

    if (!date || !description || amount === null || amount === 0) return null;
    return { rowIndex, date, description, payee: payee || undefined, amount };
  });
}
