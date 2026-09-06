"use client";
import { humanize } from "@/lib/utils";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { createAsset, updateAsset } from "@/lib/actions/asset-actions";
import { ASSET_TYPES } from "@/lib/types";
import { Plus } from "lucide-react";

export interface AssetFormValues {
  id: string;
  name: string;
  type: string;
  purchaseDate?: string | null;
  purchasePrice?: string | null;
  currentValue: string;
  currencyCode: string;
  includeInNetWorth: boolean;
  notes?: string | null;
}

export function AssetDialog({ existing, trigger }: { existing?: AssetFormValues; trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const action = existing ? (fd: FormData) => updateAsset(existing.id, fd) : (fd: FormData) => createAsset(fd);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Asset
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Asset" : "Add Asset"}</DialogTitle>
        </DialogHeader>
        <ActionForm action={action} onSuccess={() => setOpen(false)} successMessage={existing ? "Asset updated" : "Asset added"}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="name">Asset name</Label>
              <Input id="name" name="name" required defaultValue={existing?.name} placeholder="e.g. Toyota Vios 2022" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select name="type" defaultValue={existing?.type ?? "VEHICLE"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentValue">Current value</Label>
              <Input id="currentValue" name="currentValue" inputMode="decimal" required defaultValue={existing?.currentValue} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purchaseDate">Purchase date</Label>
              <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={existing?.purchaseDate?.slice(0, 10)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purchasePrice">Purchase price</Label>
              <Input id="purchasePrice" name="purchasePrice" inputMode="decimal" defaultValue={existing?.purchasePrice ?? ""} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} defaultValue={existing?.notes ?? ""} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <Checkbox name="includeInNetWorth" defaultChecked={existing?.includeInNetWorth ?? true} />
              Include in net worth
            </label>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
