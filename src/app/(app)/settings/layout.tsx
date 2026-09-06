import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "./settings-tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Settings" description="Categories, institutions, currencies, import rules, and preferences." />
      <SettingsTabs />
      {children}
    </div>
  );
}
