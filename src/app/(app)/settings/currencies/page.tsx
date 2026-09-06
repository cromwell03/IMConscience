import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ActionForm } from "@/components/action-form";
import { createCurrency, setExchangeRate } from "@/lib/actions/settings-actions";
import { format } from "date-fns";

export const metadata = { title: "Currencies — Settings" };

export default async function CurrenciesSettingsPage() {
  await requireUser();
  const [currencies, rates] = await Promise.all([
    prisma.currency.findMany({ orderBy: { code: "asc" } }),
    prisma.exchangeRate.findMany({ orderBy: { asOfDate: "desc" }, take: 20 }),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Add Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createCurrency} successMessage="Currency added" submitLabel="Add Currency">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" maxLength={3} placeholder="USD" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="US Dollar" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="symbol">Symbol</Label>
                <Input id="symbol" name="symbol" placeholder="$" required />
              </div>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Set Exchange Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted mb-3">
            Rate to convert 1 unit of the currency into your base currency (PHP). e.g. if 1 USD = ₱58.25, enter 58.25 for USD.
          </p>
          <ActionForm action={setExchangeRate} successMessage="Exchange rate saved" submitLabel="Save Rate">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currencyCode">Currency</Label>
                <Input id="currencyCode" name="currencyCode" maxLength={3} placeholder="USD" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rate">Rate (to base)</Label>
                <Input id="rate" name="rate" inputMode="decimal" placeholder="58.25" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="asOfDate">As of date</Label>
                <Input id="asOfDate" name="asOfDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currencies on file</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[{ code: "PHP", name: "Philippine Peso", symbol: "₱" }, ...currencies.filter((c) => c.code !== "PHP")].map((c) => (
                <TableRow key={c.code}>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.symbol}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Exchange Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Rate to PHP</TableHead>
                <TableHead>As of</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.currencyCode}</TableCell>
                  <TableCell>{(Number(r.rateMicros) / 1_000_000).toFixed(4)}</TableCell>
                  <TableCell>{format(r.asOfDate, "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted py-6">
                    No exchange rates set yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
