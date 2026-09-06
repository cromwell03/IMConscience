import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  ReceiptText,
  CreditCard,
  LineChart,
  Building2,
  Target,
  TrendingUp,
  BarChart3,
  FolderOpen,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/bills", label: "Bills", icon: ReceiptText },
  { href: "/debt", label: "Debt", icon: CreditCard },
  { href: "/investments", label: "Investments", icon: LineChart },
  { href: "/assets", label: "Assets", icon: Building2 },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/net-worth", label: "Net Worth", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];
