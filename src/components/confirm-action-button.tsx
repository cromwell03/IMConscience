"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmActionButton({
  action,
  confirmMessage,
  successMessage,
  children,
  ...buttonProps
}: {
  action: () => Promise<unknown>;
  confirmMessage: string;
  successMessage?: string;
  children: React.ReactNode;
} & ButtonProps) {
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setPending(true);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button {...buttonProps} disabled={pending || buttonProps.disabled} onClick={handleClick}>
      {children}
    </Button>
  );
}
