import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { AssetDialog } from "./asset-dialog";
import { deleteAsset } from "@/lib/actions/asset-actions";
import { formatMinorUnits } from "@/lib/money";
import { Pencil, Trash2 } from "lucide-react";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Assets — Personal Finance OS" };

export default async function AssetsPage() {
  const user = await requireUser();
  const assets = await prisma.asset.findMany({ where: { userId: user.id }, orderBy: { currentValueMinor: "desc" } });
  const total = assets.filter((a) => a.includeInNetWorth).reduce((sum, a) => sum + a.currentValueMinor, 0n);

  return (
    <div>
      <PageHeader title="Assets" description="Real estate, vehicles, and other significant non-financial property." actions={<AssetDialog />} />

      <Card className="mb-4">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted">Total (included in net worth)</p>
          <Money amountMinor={total} className="text-lg font-semibold" />
        </CardContent>
      </Card>

      {assets.length === 0 ? (
        <EmptyState title="No assets yet" description="Add real estate, vehicles, or other property to track your full net worth." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Card key={asset.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{asset.name}</p>
                    <p className="text-xs text-muted">{humanize(asset.type)}</p>
                  </div>
                  {!asset.includeInNetWorth && <Badge tone="neutral">Excluded</Badge>}
                </div>
                <Money amountMinor={asset.currentValueMinor} currencyCode={asset.currencyCode} className="mt-2 text-lg font-semibold" />
                {asset.purchasePriceMinor && (
                  <p className="text-xs text-muted mt-1">
                    Purchased for <Money amountMinor={asset.purchasePriceMinor} currencyCode={asset.currencyCode} />
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1">
                  <AssetDialog
                    existing={{
                      id: asset.id,
                      name: asset.name,
                      type: asset.type,
                      purchaseDate: asset.purchaseDate?.toISOString(),
                      purchasePrice: asset.purchasePriceMinor ? formatMinorUnits(asset.purchasePriceMinor, asset.currencyCode) : "",
                      currentValue: formatMinorUnits(asset.currentValueMinor, asset.currencyCode),
                      currencyCode: asset.currencyCode,
                      includeInNetWorth: asset.includeInNetWorth,
                      notes: asset.notes,
                    }}
                    trigger={
                      <button className="rounded p-1.5 text-muted hover:bg-surface-muted hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                    }
                  />
                  <ConfirmActionButton variant="ghost" size="icon" action={deleteAsset.bind(null, asset.id)} confirmMessage={`Delete "${asset.name}"?`}>
                    <Trash2 className="h-4 w-4 text-muted" />
                  </ConfirmActionButton>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
