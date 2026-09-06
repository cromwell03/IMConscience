"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { createCategory } from "@/lib/actions/category-actions";
import { Plus } from "lucide-react";

export function CategoryDialog({ categories }: { categories: { id: string; name: string; kind: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"INCOME" | "EXPENSE">("EXPENSE");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
        </DialogHeader>
        <ActionForm action={createCategory} onSuccess={() => setOpen(false)} successMessage="Category created">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "INCOME" | "EXPENSE")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="kind" value={kind} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Parent category (optional, for a subcategory)</Label>
              <Select name="parentId">
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.kind === kind)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
