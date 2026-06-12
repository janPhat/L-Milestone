"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { addCheat, deleteCheat } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CheatType = "meal" | "drink";

type CheatRow = { id: number; date: string; type: CheatType; label: string };

export function CheatLogCard({ cheats }: { cheats: CheatRow[] }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CheatType>("meal");
  const [label, setLabel] = useState("");

  // `cheats` arrives sorted by date then id; group into one row per day.
  const byDate = new Map<string, CheatRow[]>();
  for (const cheat of cheats) {
    const list = byDate.get(cheat.date);
    if (list) list.push(cheat);
    else byDate.set(cheat.date, [cheat]);
  }
  const days = [...byDate.values()];

  function remove(id: number) {
    startTransition(async () => {
      try {
        await deleteCheat({ id });
        toast.success("Cheat removed");
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await addCheat({ type, label: trimmed });
        toast.success("Cheat logged");
        setOpen(false);
        setType("meal");
        setLabel("");
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <Card className="gap-4">
      <CardHeader className="gap-0">
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle>Cheat log</CardTitle>
          <CardDescription>Weekly record</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No cheats logged this week.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {days.map((dayCheats) => (
              <li key={dayCheats[0].date} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {dayCheats.map((cheat) => (
                    <Badge
                      key={cheat.id}
                      variant="outline"
                      className="border-ring text-ring text-sm gap-1 pr-1"
                    >
                      {cheat.label}
                      <button
                        type="button"
                        aria-label={`Remove ${cheat.label}`}
                        disabled={pending}
                        onClick={() => remove(cheat.id)}
                        className="rounded-full p-0.5 text-ring/70 transition-colors hover:bg-ring/10 hover:text-ring focus-visible:ring-[2px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" disabled={pending}>
              <Plus />
              Log cheat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Log cheat</DialogTitle>
                <DialogDescription>
                  Record a cheat meal or drink for today.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cheat-type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as CheatType)}
                >
                  <SelectTrigger id="cheat-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meal">Meal</SelectItem>
                    <SelectItem value="drink">Drink</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cheat-label">Label</Label>
                <Input
                  id="cheat-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="e.g. Pizza night"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending || label.trim().length === 0}>
                  Log cheat
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
