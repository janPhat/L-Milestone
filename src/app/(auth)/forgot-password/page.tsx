"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setPending(true);
    // Don't surface success/failure differently — never reveal whether an
    // account exists for the address.
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            {sent
              ? "If an account exists for that email, a reset link is on its way."
              : "Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        {sent ? (
          <CardContent>
            <Link href="/sign-in" className="text-sm underline">
              Back to sign in
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
            </CardContent>
            <CardFooter className="mt-6 flex-col gap-4">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link href="/sign-in" className="inline-block py-2 underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </main>
  );
}
