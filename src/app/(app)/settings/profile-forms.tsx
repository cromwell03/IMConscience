"use client";

import { Input, Label } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ActionForm } from "@/components/action-form";
import { updateProfile, changePassword } from "@/lib/actions/settings-actions";

export function ProfileForm({ name, baseCurrency, currencies }: { name: string; baseCurrency: string; currencies: string[] }) {
  return (
    <ActionForm action={updateProfile} successMessage="Profile updated" submitLabel="Save Profile">
      <div className="flex flex-col gap-3 max-w-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Base currency</Label>
          <Select name="baseCurrency" defaultValue={baseCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} successMessage="Password changed" submitLabel="Change Password">
      <div className="flex flex-col gap-3 max-w-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
        </div>
      </div>
    </ActionForm>
  );
}
