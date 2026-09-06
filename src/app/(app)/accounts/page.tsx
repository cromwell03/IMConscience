import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { AccountDialog } from "./account-dialog";
import { ACCOUNT_TYPE_LABELS, LIABILITY_ACCOUNT_TYPES, type AccountType } from "@/lib/types";
import { CreditCard, Wallet, Landmark, Smartphone, TrendingUp, Banknote } from "lucide-react";

export const metadata = { title: "Accounts — Personal Finance OS" };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CASH: Banknote,
  CHECKING: Landmark,
  SAVINGS: Landmark,
  DIGITAL_BANK: Smartphone,
  EWALLET: Smartphone,
  CREDIT_CARD: CreditCard,
  LOAN: CreditCard,
  INVESTMENT: TrendingUp,
  OTHER: Wallet,
};

export default async function AccountsPage() {
  const user = await requireUser();

  const [accounts, institutions] = await Promise.all([
    prisma.account.findMany({ where: { userId: user.id }, orderBy: [{ isActive: "desc" }, { type: "asc" }, { name: "asc" }] }),
    prisma.institution.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const currencies = Array.from(new Set(["PHP", "USD", ...accounts.map((a) => a.currencyCode)]));

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Every place your money lives — banks, wallets, cards, loans."
        actions={<AccountDialog institutions={institutions} currencies={currencies} />}
      />

      {accounts.length === 0 ? (
        <EmptyState title="No accounts yet" description="Add your first bank account, e-wallet, or credit card to start tracking." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const Icon = ICONS[account.type] ?? Wallet;
            const isLiability = LIABILITY_ACCOUNT_TYPES.includes(account.type as AccountType);
            return (
              <Link key={account.id} href={`/accounts/${account.id}`}>
                <Card className={!account.isActive ? "opacity-60" : ""}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted">
                          <Icon className="h-4.5 w-4.5 text-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-muted">
                            {ACCOUNT_TYPE_LABELS[account.type as AccountType]}
                            {account.lastFourDigits ? ` •••• ${account.lastFourDigits}` : ""}
                          </p>
                        </div>
                      </div>
                      {!account.isActive && <Badge tone="neutral">Archived</Badge>}
                      {account.ownership === "BUSINESS" && account.isActive && <Badge tone="info">Business</Badge>}
                    </div>
                    <div className="mt-4">
                      <Money
                        amountMinor={isLiability ? -account.currentBalanceMinor : account.currentBalanceMinor}
                        currencyCode={account.currencyCode}
                        className="text-lg font-semibold"
                        colorize
                      />
                      {isLiability && <p className="text-xs text-muted mt-0.5">owed</p>}
                    </div>
                    {account.type === "CREDIT_CARD" && account.creditLimitMinor && account.creditLimitMinor > 0n && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                          <div
                            className="h-full bg-accent"
                            style={{
                              width: `${Math.min(100, Number((account.currentBalanceMinor * 100n) / account.creditLimitMinor))}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          Limit <Money amountMinor={account.creditLimitMinor} currencyCode={account.currencyCode} />
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
