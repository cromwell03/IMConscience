"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { createRule } from "@/lib/actions/settings-actions";
import { RULE_FIELDS, RULE_MATCH_TYPES, TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from "@/lib/types";
import { Plus } from "lucide-react";

export function RuleDialog({ categories }: { categories: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add Rule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Categorization Rule</DialogTitle>
        </DialogHeader>
        <ActionForm action={createRule} onSuccess={() => setOpen(false)} successMessage="Rule created">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Field</Label>
              <Select name="matchField" defaultValue="MERCHANT">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_FIELDS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Match type</Label>
              <Select name="matchType" defaultValue="CONTAINS">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_MATCH_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="matchValue">Match value</Label>
              <Input id="matchValue" name="matchValue" required placeholder="e.g. Netflix (or minMinor:maxMinor for amount range)" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Set category</Label>
              <Select name="categoryId">
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Set transaction type (optional)</Label>
              <Select name="setType">
                <SelectTrigger>
                  <SelectValue placeholder="Don't change" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRANSACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority (higher runs first)</Label>
              <Input id="priority" name="priority" type="number" defaultValue={0} />
            </div>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
