import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { toMinorUnits } from "../src/lib/money";
import { computeAccountDelta } from "../src/lib/ledger-core";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  type AccountType,
  type BusinessTransferSubtype,
  type TransactionType,
} from "../src/lib/types";

const prisma = new PrismaClient();

const SEED_EMAIL = "cromwell.arriesgado@gmail.com";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

function monthsAgoOn(monthsAgo: number, dayOfMonth: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo, dayOfMonth);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function recomputeAllBalances(userId: string) {
  const accounts = await prisma.account.findMany({ where: { userId } });
  for (const account of accounts) {
    const [asSource, asDestination] = await Promise.all([
      prisma.transaction.findMany({
        where: { sourceAccountId: account.id, deletedAt: null },
        select: { type: true, amountMinor: true, businessTransferSubtype: true, destinationAccountId: true },
      }),
      prisma.transaction.findMany({
        where: { destinationAccountId: account.id, deletedAt: null },
        select: { type: true, amountMinor: true, destinationAmountMinor: true },
      }),
    ]);

    let total = account.openingBalanceMinor;
    for (const tx of asSource) {
      total += computeAccountDelta({
        type: tx.type as TransactionType,
        role: "source",
        accountType: account.type as AccountType,
        amountMinor: tx.amountMinor,
        hasDestination: !!tx.destinationAccountId,
        businessTransferSubtype: tx.businessTransferSubtype as BusinessTransferSubtype | null,
      });
    }
    for (const tx of asDestination) {
      total += computeAccountDelta({
        type: tx.type as TransactionType,
        role: "destination",
        accountType: account.type as AccountType,
        amountMinor: tx.destinationAmountMinor ?? tx.amountMinor,
        hasDestination: true,
      });
    }

    await prisma.account.update({ where: { id: account.id }, data: { currentBalanceMinor: total } });
  }
}

async function main() {
  console.log("Seeding Personal Finance OS demo data...");

  const existingUser = await prisma.user.findUnique({ where: { email: SEED_EMAIL } });
  let generatedPassword: string | null = null;

  let user = existingUser;
  if (!user) {
    generatedPassword = randomBytes(9).toString("base64url");
    const passwordHash = await bcrypt.hash(generatedPassword, 12);
    user = await prisma.user.create({
      data: { email: SEED_EMAIL, name: "Cromwell", passwordHash, baseCurrency: "PHP" },
    });
    console.log(`Created user ${SEED_EMAIL}`);
  } else {
    console.log(`User ${SEED_EMAIL} already exists — reusing it.`);
  }

  // --- Currencies ---------------------------------------------------------
  await prisma.currency.upsert({
    where: { code: "PHP" },
    update: {},
    create: { code: "PHP", name: "Philippine Peso", symbol: "₱", isBase: true },
  });
  await prisma.currency.upsert({
    where: { code: "USD" },
    update: {},
    create: { code: "USD", name: "US Dollar", symbol: "$" },
  });
  await prisma.exchangeRate.create({
    data: { currencyCode: "USD", rateMicros: 58_250_000n, asOfDate: new Date() },
  });

  // --- Categories -----------------------------------------------------------
  async function upsertTopLevelCategory(name: string, kind: "EXPENSE" | "INCOME"): Promise<string> {
    const existing = await prisma.category.findFirst({ where: { userId: user!.id, name, parentId: null } });
    if (existing) return existing.id;
    const created = await prisma.category.create({ data: { userId: user!.id, name, kind, isDefault: true } });
    return created.id;
  }

  const expenseCategoryByName = new Map<string, string>();
  for (const name of DEFAULT_EXPENSE_CATEGORIES) {
    expenseCategoryByName.set(name, await upsertTopLevelCategory(name, "EXPENSE"));
  }
  const incomeCategoryByName = new Map<string, string>();
  for (const name of DEFAULT_INCOME_CATEGORIES) {
    incomeCategoryByName.set(name, await upsertTopLevelCategory(name, "INCOME"));
  }

  // --- Institutions -----------------------------------------------------------
  const bdo = await prisma.institution.upsert({
    where: { userId_name: { userId: user.id, name: "BDO" } },
    update: {},
    create: { userId: user.id, name: "BDO" },
  });
  const bpi = await prisma.institution.upsert({
    where: { userId_name: { userId: user.id, name: "BPI" } },
    update: {},
    create: { userId: user.id, name: "BPI" },
  });
  const gcashInst = await prisma.institution.upsert({
    where: { userId_name: { userId: user.id, name: "GCash" } },
    update: {},
    create: { userId: user.id, name: "GCash" },
  });

  // --- Accounts -----------------------------------------------------------
  async function upsertAccount(data: {
    name: string;
    type: AccountType;
    currencyCode: string;
    institutionId?: string;
    openingBalanceMinor: bigint;
    creditLimitMinor?: bigint;
    interestRateBps?: number;
    minimumPaymentMinor?: bigint;
    statementDay?: number;
    paymentDueDay?: number;
    lastFourDigits?: string;
  }) {
    const existing = await prisma.account.findFirst({ where: { userId: user!.id, name: data.name } });
    if (existing) return existing;
    return prisma.account.create({
      data: {
        userId: user!.id,
        name: data.name,
        type: data.type,
        ownership: "PERSONAL",
        currencyCode: data.currencyCode,
        institutionId: data.institutionId,
        openingBalanceMinor: data.openingBalanceMinor,
        currentBalanceMinor: data.openingBalanceMinor,
        creditLimitMinor: data.creditLimitMinor,
        interestRateBps: data.interestRateBps,
        minimumPaymentMinor: data.minimumPaymentMinor,
        statementDay: data.statementDay,
        paymentDueDay: data.paymentDueDay,
        lastFourDigits: data.lastFourDigits,
      },
    });
  }

  const bdoSavings = await upsertAccount({
    name: "BDO Savings",
    type: "SAVINGS",
    currencyCode: "PHP",
    institutionId: bdo.id,
    openingBalanceMinor: toMinorUnits("85000.00"),
    lastFourDigits: "4821",
  });
  await upsertAccount({
    name: "BPI Savings",
    type: "SAVINGS",
    currencyCode: "PHP",
    institutionId: bpi.id,
    openingBalanceMinor: toMinorUnits("32000.00"),
    lastFourDigits: "7734",
  });
  const gcash = await upsertAccount({
    name: "GCash",
    type: "EWALLET",
    currencyCode: "PHP",
    institutionId: gcashInst.id,
    openingBalanceMinor: toMinorUnits("4500.00"),
  });
  const cash = await upsertAccount({
    name: "Cash",
    type: "CASH",
    currencyCode: "PHP",
    openingBalanceMinor: toMinorUnits("3000.00"),
  });
  await upsertAccount({
    name: "USD Savings",
    type: "SAVINGS",
    currencyCode: "USD",
    institutionId: bdo.id,
    openingBalanceMinor: toMinorUnits("1200.00", "USD"),
    lastFourDigits: "9012",
  });
  const creditCard = await upsertAccount({
    name: "Primary Credit Card",
    type: "CREDIT_CARD",
    currencyCode: "PHP",
    institutionId: bdo.id,
    openingBalanceMinor: 0n,
    creditLimitMinor: toMinorUnits("150000.00"),
    interestRateBps: 2995,
    minimumPaymentMinor: toMinorUnits("2000.00"),
    statementDay: 25,
    paymentDueDay: 10,
    lastFourDigits: "5566",
  });
  const timeDeposit = await upsertAccount({
    name: "BDO Time Deposit",
    type: "INVESTMENT",
    currencyCode: "PHP",
    institutionId: bdo.id,
    openingBalanceMinor: 0n,
  });

  // --- Existing transactions guard (idempotency for reruns) -----------------
  const alreadySeeded = await prisma.transaction.findFirst({ where: { userId: user.id, notes: "seed-data" } });
  if (alreadySeeded) {
    console.log("Sample transactions already exist — skipping transaction seeding.");
  } else {
    async function tx(data: {
      date: Date;
      description: string;
      payee?: string;
      amount: string;
      currencyCode?: string;
      type: TransactionType;
      sourceAccountId: string;
      destinationAccountId?: string;
      destinationAmount?: string;
      categoryId?: string;
      businessTransferSubtype?: BusinessTransferSubtype;
    }) {
      const currencyCode = data.currencyCode ?? "PHP";
      await prisma.transaction.create({
        data: {
          userId: user!.id,
          date: data.date,
          description: data.description,
          payee: data.payee,
          amountMinor: toMinorUnits(data.amount, currencyCode),
          currencyCode,
          destinationAmountMinor: data.destinationAmount
            ? toMinorUnits(data.destinationAmount, "USD")
            : undefined,
          type: data.type,
          sourceAccountId: data.sourceAccountId,
          destinationAccountId: data.destinationAccountId,
          categoryId: data.categoryId,
          businessTransferSubtype: data.businessTransferSubtype,
          notes: "seed-data",
        },
      });
    }

    const cat = (map: Map<string, string>, name: string) => map.get(name)!;

    // 4 months of realistic history
    for (let m = 3; m >= 0; m--) {
      // Salary income
      await tx({
        date: monthsAgoOn(m, 28),
        description: "Monthly Salary",
        payee: "Employer Inc.",
        amount: "52000.00",
        type: "INCOME",
        sourceAccountId: bdoSavings.id,
        categoryId: cat(incomeCategoryByName, "Salary"),
      });

      // Groceries x2
      await tx({
        date: monthsAgoOn(m, 5),
        description: "SM Supermarket groceries",
        payee: "SM Supermarket",
        amount: "3200.50",
        type: "EXPENSE",
        sourceAccountId: gcash.id,
        categoryId: cat(expenseCategoryByName, "Food & Groceries"),
      });
      await tx({
        date: monthsAgoOn(m, 19),
        description: "Robinsons Supermarket groceries",
        payee: "Robinsons Supermarket",
        amount: "2850.00",
        type: "EXPENSE",
        sourceAccountId: bdoSavings.id,
        categoryId: cat(expenseCategoryByName, "Food & Groceries"),
      });

      // Dining on credit card (EXPENSE on credit card increases balance owed)
      await tx({
        date: monthsAgoOn(m, 8),
        description: "Dinner at Sambokojin",
        payee: "Sambokojin",
        amount: "2400.00",
        type: "EXPENSE",
        sourceAccountId: creditCard.id,
        categoryId: cat(expenseCategoryByName, "Dining"),
      });
      await tx({
        date: monthsAgoOn(m, 14),
        description: "Coffee & lunch",
        payee: "Starbucks",
        amount: "580.00",
        type: "EXPENSE",
        sourceAccountId: creditCard.id,
        categoryId: cat(expenseCategoryByName, "Dining"),
      });

      // Fuel
      await tx({
        date: monthsAgoOn(m, 11),
        description: "Gasoline",
        payee: "Shell",
        amount: "2200.00",
        type: "EXPENSE",
        sourceAccountId: cash.id,
        categoryId: cat(expenseCategoryByName, "Fuel"),
      });

      // Subscriptions on credit card
      await tx({
        date: monthsAgoOn(m, 3),
        description: "Netflix subscription",
        payee: "Netflix",
        amount: "549.00",
        type: "EXPENSE",
        sourceAccountId: creditCard.id,
        categoryId: cat(expenseCategoryByName, "Subscriptions"),
      });
      await tx({
        date: monthsAgoOn(m, 3),
        description: "Spotify subscription",
        payee: "Spotify",
        amount: "149.00",
        type: "EXPENSE",
        sourceAccountId: creditCard.id,
        categoryId: cat(expenseCategoryByName, "Subscriptions"),
      });

      // Insurance
      await tx({
        date: monthsAgoOn(m, 6),
        description: "Health insurance premium",
        payee: "PhilCare",
        amount: "1800.00",
        type: "EXPENSE",
        sourceAccountId: bdoSavings.id,
        categoryId: cat(expenseCategoryByName, "Insurance"),
      });

      // Account transfer: top up GCash from BDO
      await tx({
        date: monthsAgoOn(m, 4),
        description: "Top up GCash",
        amount: "4000.00",
        type: "TRANSFER",
        sourceAccountId: bdoSavings.id,
        destinationAccountId: gcash.id,
      });

      // ATM withdrawal — keeps the Cash account funded for fuel etc.
      await tx({
        date: monthsAgoOn(m, 10),
        description: "ATM withdrawal",
        amount: "5000.00",
        type: "TRANSFER",
        sourceAccountId: bdoSavings.id,
        destinationAccountId: cash.id,
      });

      // Credit card bill payment — pays off PRIOR statement, not this month's
      // charges, but for demo simplicity we settle a flat amount each month.
      // This is a DEBT_PAYMENT (transfer), never a second EXPENSE.
      await tx({
        date: monthsAgoOn(m, 9),
        description: "Credit card bill payment",
        amount: "3500.00",
        type: "DEBT_PAYMENT",
        sourceAccountId: bdoSavings.id,
        destinationAccountId: creditCard.id,
      });

      // Business-related transfers (external business books — no destination)
      if (m % 2 === 0) {
        await tx({
          date: monthsAgoOn(m, 15),
          description: "Owner draw from consulting business",
          amount: "8000.00",
          type: "BUSINESS_TRANSFER",
          sourceAccountId: bdoSavings.id,
          businessTransferSubtype: "OWNER_WITHDRAWAL",
        });
      } else {
        await tx({
          date: monthsAgoOn(m, 15),
          description: "Capital contribution to consulting business",
          amount: "5000.00",
          type: "BUSINESS_TRANSFER",
          sourceAccountId: bdoSavings.id,
          businessTransferSubtype: "OWNER_CONTRIBUTION",
        });
      }
    }

    // One-off: investment contribution
    await tx({
      date: daysAgo(20),
      description: "Fund time deposit",
      amount: "20000.00",
      type: "INVESTMENT",
      sourceAccountId: bdoSavings.id,
      destinationAccountId: timeDeposit.id,
    });

    // Recent uncategorized transaction to demonstrate "Attention Needed"
    await tx({
      date: daysAgo(2),
      description: "Miscellaneous purchase",
      payee: "7-Eleven",
      amount: "245.00",
      type: "EXPENSE",
      sourceAccountId: cash.id,
    });

    console.log("Sample transactions created.");
  }

  // --- Bills ---------------------------------------------------------------
  const existingBills = await prisma.bill.count({ where: { userId: user.id } });
  if (existingBills === 0) {
    const inTenDays = new Date();
    inTenDays.setDate(inTenDays.getDate() + 10);
    const inTwoDays = new Date();
    inTwoDays.setDate(inTwoDays.getDate() + 2);
    const inFourMonths = new Date();
    inFourMonths.setMonth(inFourMonths.getMonth() + 4);

    await prisma.bill.create({
      data: {
        userId: user.id,
        name: "Meralco Electricity",
        categoryId: expenseCategoryByName.get("Utilities"),
        amountMinor: toMinorUnits("3200.00"),
        currencyCode: "PHP",
        frequency: "MONTHLY",
        accountId: bdoSavings.id,
        nextDueDate: inTenDays,
        reminderDaysBefore: 5,
      },
    });
    await prisma.bill.create({
      data: {
        userId: user.id,
        name: "PLDT Internet",
        categoryId: expenseCategoryByName.get("Utilities"),
        amountMinor: toMinorUnits("2599.00"),
        currencyCode: "PHP",
        frequency: "MONTHLY",
        accountId: creditCard.id,
        nextDueDate: inTwoDays,
        reminderDaysBefore: 5,
        autoPay: true,
      },
    });
    await prisma.bill.create({
      data: {
        userId: user.id,
        name: "Car Insurance Renewal",
        categoryId: expenseCategoryByName.get("Insurance"),
        amountMinor: toMinorUnits("18000.00"),
        currencyCode: "PHP",
        frequency: "ANNUAL",
        accountId: bdoSavings.id,
        nextDueDate: inFourMonths,
        reminderDaysBefore: 14,
      },
    });
    console.log("Bills created.");
  }

  // --- Goals -----------------------------------------------------------------
  const existingGoals = await prisma.goal.count({ where: { userId: user.id } });
  if (existingGoals === 0) {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 10);
    await prisma.goal.create({
      data: {
        userId: user.id,
        name: "Emergency Fund",
        type: "EMERGENCY_FUND",
        targetAmountMinor: toMinorUnits("150000.00"),
        currentAmountMinor: toMinorUnits("45000.00"),
        targetDate,
        monthlyContributionTargetMinor: toMinorUnits("10000.00"),
      },
    });
    console.log("Goals created.");
  }

  // --- Categorization rule example ------------------------------------------
  const existingRules = await prisma.categorizationRule.count({ where: { userId: user.id } });
  if (existingRules === 0) {
    await prisma.categorizationRule.create({
      data: {
        userId: user.id,
        priority: 10,
        matchField: "MERCHANT",
        matchType: "CONTAINS",
        matchValue: "Netflix",
        categoryId: expenseCategoryByName.get("Subscriptions"),
      },
    });
    await prisma.categorizationRule.create({
      data: {
        userId: user.id,
        priority: 10,
        matchField: "MERCHANT",
        matchType: "CONTAINS",
        matchValue: "Shell",
        categoryId: expenseCategoryByName.get("Fuel"),
      },
    });
    console.log("Categorization rules created.");
  }

  await recomputeAllBalances(user.id);
  console.log("Balances recomputed.");

  if (generatedPassword) {
    console.log("\n==============================================");
    console.log(` Login email:    ${SEED_EMAIL}`);
    console.log(` Login password: ${generatedPassword}`);
    console.log(" (save this now — it is not stored anywhere else)");
    console.log("==============================================\n");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
