import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Personal Finance OS" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold">
            ₱
          </div>
          <h1 className="text-lg font-semibold">Personal Finance OS</h1>
          <p className="text-sm text-muted mt-1">Your private financial command center</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
