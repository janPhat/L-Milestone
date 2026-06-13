"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createInvite, listInvites, revokeInvite, type InviteSummary } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Status = "active" | "used" | "revoked";

function statusOf(invite: InviteSummary): Status {
  if (invite.usedAt != null) return "used";
  if (invite.revokedAt != null) return "revoked";
  return "active";
}

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  used: "Used",
  revoked: "Revoked",
};

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Invite code copied");
  } catch {
    toast.error("Couldn't copy — select and copy it manually.");
  }
}

export function InvitesDialog() {
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<InviteSummary[] | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      setInvites(await listInvites());
    } catch {
      toast.error("Couldn't load your invites.");
    }
  }, []);

  // Lazy-load the list the first time the dialog opens.
  useEffect(() => {
    if (open && invites === null) void refresh();
  }, [open, invites, refresh]);

  function onGenerate() {
    startTransition(async () => {
      try {
        await createInvite();
        await refresh();
        toast.success("Invite code created — use Copy to share it.");
      } catch {
        toast.error("Couldn't create an invite. Please try again.");
      }
    });
  }

  function onRevoke(code: string) {
    startTransition(async () => {
      try {
        await revokeInvite({ code });
        await refresh();
      } catch {
        toast.error("Couldn't revoke that code. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Invites</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Each code lets one person sign up, then it&apos;s spent. Revoke an
            unused code any time.
          </DialogDescription>
        </DialogHeader>

        <Button type="button" onClick={onGenerate} disabled={pending} className="w-full">
          {pending ? "Working…" : "Generate invite code"}
        </Button>

        <div className="mt-1 grid gap-2">
          {invites === null ? (
            <p className="py-2 text-sm text-muted-foreground">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No invites yet. Generate one to share.
            </p>
          ) : (
            invites.map((invite) => {
              const status = statusOf(invite);
              return (
                <div
                  key={invite.code}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p
                      className={`truncate font-mono text-sm ${
                        status === "active" ? "" : "text-muted-foreground line-through"
                      }`}
                    >
                      {invite.code}
                    </p>
                    <p className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</p>
                  </div>
                  {status === "active" ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(invite.code)}
                      >
                        Copy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onRevoke(invite.code)}
                        disabled={pending}
                        className="text-red-500 hover:text-red-500"
                      >
                        Revoke
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
