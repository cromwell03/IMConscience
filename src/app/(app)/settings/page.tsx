import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm, PasswordForm } from "./profile-forms";

export const metadata = { title: "Settings — Personal Finance OS" };

export default async function SettingsProfilePage() {
  const user = await requireUser();
  const currencies = await prisma.currency.findMany({ orderBy: { code: "asc" } });
  const currencyCodes = Array.from(new Set(["PHP", "USD", ...currencies.map((c) => c.code)]));

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name ?? ""} baseCurrency={user.baseCurrency} currencies={currencyCodes} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
