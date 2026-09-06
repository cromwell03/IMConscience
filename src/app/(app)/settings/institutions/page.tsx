import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ActionForm } from "@/components/action-form";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { createInstitution, deleteInstitution } from "@/lib/actions/settings-actions";
import { Trash2 } from "lucide-react";

export const metadata = { title: "Institutions — Settings" };

export default async function InstitutionsSettingsPage() {
  const user = await requireUser();
  const institutions = await prisma.institution.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { accounts: true } } },
  });

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <Card>
        <CardContent className="pt-5">
          <ActionForm action={createInstitution} successMessage="Institution added" submitLabel="Add Institution">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Institution name</Label>
              <Input id="name" name="name" required placeholder="e.g. BDO, BPI, GCash" />
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 flex flex-col divide-y divide-border">
          {institutions.map((inst) => (
            <div key={inst.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{inst.name}</p>
                <p className="text-xs text-muted">{inst._count.accounts} account(s)</p>
              </div>
              <ConfirmActionButton
                variant="ghost"
                size="icon"
                action={deleteInstitution.bind(null, inst.id)}
                confirmMessage={`Delete "${inst.name}"?`}
              >
                <Trash2 className="h-4 w-4 text-muted" />
              </ConfirmActionButton>
            </div>
          ))}
          {institutions.length === 0 && <p className="py-4 text-sm text-muted">No institutions yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
