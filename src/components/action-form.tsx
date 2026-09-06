"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Wraps a server action so thrown ActionError messages surface as a toast
 * instead of Next.js's default error overlay, and the dialog closes on
 * success. Server actions are invoked directly (not via <form action>) so we
 * can catch and display errors inline.
 */
export function ActionForm({
  action,
  onSuccess,
  successMessage,
  children,
  submitLabel = "Save",
  className,
}: {
  action: (formData: FormData) => Promise<unknown>;
  onSuccess?: () => void;
  successMessage?: string;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      await action(formData);
      if (successMessage) toast.success(successMessage);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
      <div className="mt-6 flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
