"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { deleteAccount } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CONFIRM_WORD = "DELETE";

export function AccountDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (confirm.trim() !== CONFIRM_WORD) return;
    startTransition(async () => {
      try {
        await deleteAccount();
        // Session row is already gone; clear the cookie best-effort, then leave.
        await authClient.signOut().catch(() => {});
        router.push("/sign-in");
        router.refresh();
      } catch {
        toast.error("Couldn't delete your account. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Export your data or delete your account. See the{" "}
            <Link href="/privacy" className="underline">
              privacy note
            </Link>
            .
          </DialogDescription>
        </DialogHeader>

        <Button asChild variant="secondary" className="w-full">
          <a href="/api/export" download>
            Export my data (JSON)
          </a>
        </Button>

        <div className="mt-2 grid gap-2 rounded-md border border-red-500/40 p-3">
          <p className="text-sm font-medium text-foreground">Delete account</p>
          <p className="text-xs text-muted-foreground">
            Permanently deletes your account and every entry. This can&apos;t be
            undone.
          </p>
          <Label htmlFor="confirm-delete" className="text-xs">
            Type {CONFIRM_WORD} to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="off"
            disabled={pending}
          />
          <Button
            type="button"
            onClick={onDelete}
            disabled={pending || confirm.trim() !== CONFIRM_WORD}
            className="bg-red-500 text-white hover:bg-red-500/90"
          >
            {pending ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
