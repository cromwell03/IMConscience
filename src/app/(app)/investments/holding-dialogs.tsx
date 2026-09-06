"use client";
import { humanize } from "@/lib/utils";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { createHolding, updateHoldingValuation } from "@/lib/actions/investment-actions";
import { ASSET_CLASSES } from "@/lib/types";
import { Plus, RefreshCw } from "lucide-react";

export function AddHoldingDialog({ accountId }: { accountId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Add Holding
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Holding</DialogTitle>
        </DialogHeader>
        <ActionForm action={(fd) => createHolding(accountId, fd)} onSuccess={() => setOpen(false)} successMessage="Holding added">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="e.g. Vanguard S&P 500 ETF" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="symbol">Symbol (optional)</Label>
              <Input id="symbol" name="symbol" placeholder="VOO" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Asset class</Label>
              <Select name="assetClass" defaultValue="STOCK">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {humanize(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" required placeholder="10.5" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="averageCost">Average cost (per unit)</Label>
              <Input id="averageCost" name="averageCost" inputMode="decimal" required placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPrice">Current price (per unit)</Label>
              <Input id="currentPrice" name="currentPrice" inputMode="decimal" placeholder="0.00" />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function UpdateValuationDialog({ holdingId, currentPrice, quantity }: { holdingId: string; currentPrice: string; quantity: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Valuation</DialogTitle>
        </DialogHeader>
        <ActionForm action={(fd) => updateHoldingValuation(holdingId, fd)} onSuccess={() => setOpen(false)} successMessage="Valuation updated">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" defaultValue={quantity} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPrice">Current price (per unit)</Label>
              <Input id="currentPrice" name="currentPrice" inputMode="decimal" required defaultValue={currentPrice} />
            </div>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
