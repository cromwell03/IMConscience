// Central string-union "enums" backing the Prisma String columns.
// SQLite has no native enum support, so these are enforced at the app layer
// (zod schemas + these TS types) instead of the database layer.

export const ACCOUNT_TYPES = [
  "CASH",
  "CHECKING",
  "SAVINGS",
  "DIGITAL_BANK",
  "EWALLET",
  "CREDIT_CARD",
  "LOAN",
  "INVESTMENT",
  "OTHER",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: "Cash",
  CHECKING: "Checking",
  SAVINGS: "Savings",
  DIGITAL_BANK: "Digital Bank",
  EWALLET: "E-Wallet",
  CREDIT_CARD: "Credit Card",
  LOAN: "Loan",
  INVESTMENT: "Investment",
  OTHER: "Other",
};

// Account types whose balances are liabilities (owe money) rather than assets.
export const LIABILITY_ACCOUNT_TYPES: AccountType[] = ["CREDIT_CARD", "LOAN"];
// Account types counted as "liquid cash" on the dashboard.
export const LIQUID_ACCOUNT_TYPES: AccountType[] = [
  "CASH",
  "CHECKING",
  "SAVINGS",
  "DIGITAL_BANK",
  "EWALLET",
];

export const ACCOUNT_OWNERSHIPS = ["PERSONAL", "BUSINESS"] as const;
export type AccountOwnership = (typeof ACCOUNT_OWNERSHIPS)[number];

export const CATEGORY_KINDS = ["INCOME", "EXPENSE"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const TRANSACTION_TYPES = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "REFUND",
  "INVESTMENT",
  "DEBT_PAYMENT",
  "BUSINESS_TRANSFER",
  "ADJUSTMENT",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  TRANSFER: "Transfer",
  REFUND: "Refund",
  INVESTMENT: "Investment",
  DEBT_PAYMENT: "Debt Payment",
  BUSINESS_TRANSFER: "Business Transfer",
  ADJUSTMENT: "Adjustment",
};

// Types that require a destinationAccountId.
export const TRANSFER_LIKE_TYPES: TransactionType[] = [
  "TRANSFER",
  "DEBT_PAYMENT",
  "BUSINESS_TRANSFER",
];

// Types that count as cash-flow income for savings-rate / dashboard math.
export const INCOME_EFFECT_TYPES: TransactionType[] = ["INCOME", "REFUND"];
// Types that count as cash-flow expense.
export const EXPENSE_EFFECT_TYPES: TransactionType[] = ["EXPENSE"];

export const BUSINESS_TRANSFER_SUBTYPES = [
  "OWNER_CONTRIBUTION",
  "OWNER_WITHDRAWAL",
  "SALARY",
  "DIVIDEND",
  "REIMBURSEMENT",
  "PERSONAL_LOAN_TO_BUSINESS",
  "BUSINESS_REPAYMENT",
  "OTHER",
] as const;
export type BusinessTransferSubtype = (typeof BUSINESS_TRANSFER_SUBTYPES)[number];

// Subtypes where money flows INTO the personal account when there is no
// tracked counterpart (destinationAccountId is null) — e.g. the business's
// own books live outside this app. Used only in that untracked case; when
// both accounts are tracked here, standard transfer direction applies instead.
export const BUSINESS_TRANSFER_INFLOW_SUBTYPES: BusinessTransferSubtype[] = [
  "OWNER_WITHDRAWAL",
  "SALARY",
  "DIVIDEND",
  "REIMBURSEMENT",
  "BUSINESS_REPAYMENT",
];

export const BUSINESS_TRANSFER_SUBTYPE_LABELS: Record<BusinessTransferSubtype, string> = {
  OWNER_CONTRIBUTION: "Owner Contribution",
  OWNER_WITHDRAWAL: "Owner Withdrawal / Draw",
  SALARY: "Salary",
  DIVIDEND: "Dividend / Distribution",
  REIMBURSEMENT: "Reimbursement",
  PERSONAL_LOAN_TO_BUSINESS: "Personal Loan to Business",
  BUSINESS_REPAYMENT: "Business Repayment",
  OTHER: "Other Business Transfer",
};

export const RULE_FIELDS = ["MERCHANT", "DESCRIPTION", "AMOUNT", "ACCOUNT"] as const;
export type RuleField = (typeof RULE_FIELDS)[number];

export const RULE_MATCH_TYPES = ["CONTAINS", "EQUALS", "REGEX", "AMOUNT_RANGE"] as const;
export type RuleMatchType = (typeof RULE_MATCH_TYPES)[number];

export const BILL_FREQUENCIES = [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "SEMIANNUAL",
  "ANNUAL",
  "CUSTOM",
] as const;
export type BillFrequency = (typeof BILL_FREQUENCIES)[number];

export const BILL_STATUSES = ["SCHEDULED", "DUE_SOON", "PAID", "OVERDUE"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const ASSET_CLASSES = [
  "STOCK",
  "ETF",
  "MUTUAL_FUND",
  "BOND",
  "CRYPTO",
  "TIME_DEPOSIT",
  "OTHER",
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const ASSET_TYPES = [
  "REAL_ESTATE",
  "VEHICLE",
  "BUSINESS_INTEREST",
  "VALUABLE_PROPERTY",
  "OTHER",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const GOAL_TYPES = [
  "EMERGENCY_FUND",
  "TRAVEL",
  "PROPERTY_PURCHASE",
  "INVESTMENT_TARGET",
  "VEHICLE",
  "MAJOR_PURCHASE",
  "RETIREMENT",
  "OTHER",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const DOCUMENT_TYPES = [
  "BANK_STATEMENT",
  "CC_STATEMENT",
  "RECEIPT",
  "INSURANCE_POLICY",
  "LOAN_AGREEMENT",
  "INVESTMENT_STATEMENT",
  "TAX_DOCUMENT",
  "OTHER",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const RECONCILIATION_STATUSES = ["BALANCED", "DISCREPANCY"] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Housing",
  "Utilities",
  "Food & Groceries",
  "Dining",
  "Transportation",
  "Fuel",
  "Vehicle",
  "Shopping",
  "Health",
  "Fitness",
  "Insurance",
  "Family",
  "Entertainment",
  "Travel",
  "Education",
  "Technology",
  "Subscriptions",
  "Gifts/Donations",
  "Taxes",
  "Personal Care",
  "Miscellaneous",
];

export const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Business Income",
  "Dividends",
  "Interest",
  "Investment Income",
  "Royalties",
  "Rental Income",
  "Refunds",
  "Other Income",
];
