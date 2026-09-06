"use client";
import { humanize } from "@/lib/utils";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";
import { uploadDocument } from "@/lib/actions/document-actions";
import { DOCUMENT_TYPES } from "@/lib/types";
import { Upload } from "lucide-react";

export function UploadDialog({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4" /> Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <ActionForm action={uploadDocument} onSuccess={() => setOpen(false)} successMessage="Document uploaded">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file">File</Label>
              <input id="file" name="file" type="file" required className="text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Document type</Label>
              <Select name="documentType" defaultValue="OTHER">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {humanize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Linked account (optional)</Label>
              <Select name="linkedAccountId">
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
