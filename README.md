# Personal Finance OS

A private, single-user personal finance operating system — a single source of truth for cash, accounts, debt, investments, assets, budgets, bills, goals, and net worth. Built to answer four questions at a glance: *How much money do I have? Where is it going? How is my position changing? What needs my attention?*

This is a personal tool, not a SaaS product. It's designed to be self-hosted and run for one user.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript
- **Prisma 5** + **SQLite** — file-based, zero external dependencies, easy to back up (it's one file)
- **Custom session auth** — email/password, bcrypt hashing, signed httpOnly JWT cookie (via `jose`). No third-party auth service.
- **Tailwind CSS v4** + a small hand-built UI kit (Radix primitives underneath: Dialog, Select, Tabs, Dropdown, Checkbox, Switch)
- **Recharts** for charts, **Papaparse** / **SheetJS (xlsx)** for CSV/Excel import parsing

## Getting started

```bash
npm install
cp .env.example .env        # then edit AUTH_SECRET to a long random string
npx prisma db push          # creates prisma/data/dev.db
npm run db:seed             # creates a demo user + realistic PHP sample data
npm run dev
```

The seed script prints a login email and a freshly generated password to the console — copy it immediately, it is never stored in plaintext anywhere and isn't printed again. Re-running the seed script is safe: it's idempotent and reuses the existing user rather than creating a duplicate.

Open http://localhost:3000 and sign in.

## Data model & correctness rules

The schema (`prisma/schema.prisma`) is deliberately more complete than the UI currently exposes, so later features (market-price sync, PDF statement import, an AI assistant reading this same data) don't require re-modeling anything.

**Money** is always stored as `BigInt` **minor units** (centavos/cents) — see `src/lib/money.ts`. Never floats, never `Number` for accumulation. Investment share quantities use fixed-point decimal-string math (`multiplyQuantityByPriceMinor`) for the same reason.

**The ledger** (`src/lib/ledger-core.ts` + `src/lib/ledger.ts`) is the single place that decides how a transaction affects an account balance:

- A **transfer** is one `Transaction` row with `sourceAccountId` (money leaves) and `destinationAccountId` (money arrives) — it never creates income or expense.
- A **credit-card purchase** is an `EXPENSE` on the card account at the time of purchase, which *increases* the card's balance (what you owe). **Paying the card's bill** is a `TRANSFER`/`DEBT_PAYMENT`, which *decreases* it — so it's never counted as a second expense.
- **Business-related transfers** get a dedicated `BUSINESS_TRANSFER` type with a subtype (owner contribution, draw, salary, dividend, reimbursement, loan to/from a business). They're excluded from personal income/expense and reported separately on the Reports page.
- Account balances are **fully recomputed** from the opening balance + every non-deleted transaction after every write — not incrementally patched — so they can never silently drift out of sync with the ledger.
- Every transaction list (dashboard, account ledger, the main ledger table) renders through `src/lib/tx-display.ts`, so an amount's sign and color mean the same thing everywhere.

**Net worth** history accumulates automatically: every dashboard/net-worth page load records (or updates) a snapshot for today, so a real trend line builds up over time without a cron job.

## What's implemented

Per the brief's "first milestone" priority list, all of these are fully functional, not mocked:

Auth · Accounts (incl. credit-card/loan fields, reconciliation) · Categories (with subcategories) · Transactions (search/filter, split across categories, bulk categorize/delete, tags) · Transfers (same- and cross-currency) · Dashboard · Monthly income/expense + savings rate · Net worth (with history) · Bills (recurring, auto-generates the next due date when marked paid) · CSV/Excel import (column-mapping wizard with duplicate detection and per-row category override)

Also implemented, at a slightly lighter but real (non-decorative) level: Budgets (monthly, per-category, copy-forward), Debt (payoff estimate via amortization), Investments (manual holdings + valuation history — architected so a market-price API can be plugged in later), Assets, Goals, Reports (by category/merchant/business-transfer/account, with date-range presets), Documents (file upload + linking to an account/transaction/bill), Settings (institutions, currencies + exchange rates, categorization rules).

**Categorization rules** run on new transactions and on import, and never touch a transaction once it's marked reconciled.

## What's intentionally not built yet

- PDF bank-statement parsing (the import pipeline is structured so this slots in as another `lib/import.ts` parser feeding the same `analyzeImportRows`/`commitImport` actions)
- Live market-price sync for investments (holdings already carry `currentPriceMinor` + a valuation-history table; this just needs a scheduled fetch)
- The AI financial assistant described in the brief — deliberately out of scope until the ledger itself has been used and trusted; the query layer in `src/lib/calculations.ts` is written to be a clean base for it
- Multi-user support (this is a single-user app by design)

## Project structure

```
prisma/schema.prisma       data model (see comments — money units, transfer semantics)
prisma/seed.ts             demo user + realistic PHP sample data
src/lib/                   business logic, kept out of components on purpose:
  money.ts, ledger-core.ts   pure, dependency-free financial math
  ledger.ts, calculations.ts  DB-backed balance/report queries ("server-only")
  actions/*.ts               Server Actions (mutations), one file per domain
src/components/ui/         small design-system primitives
src/app/(auth)/login        sign-in
src/app/(app)/...           the app shell + one folder per nav section
```

## Security notes

Secrets live in `.env` (gitignored) — see `.env.example`. Sessions are httpOnly, `sameSite=lax` signed JWT cookies; passwords are bcrypt-hashed. Account numbers are never stored in full — only an optional last-four. Uploaded documents are stored on disk under `storage/documents/<userId>/…` (gitignored) and served through an authenticated route handler that checks ownership, not directly from `/public`.
