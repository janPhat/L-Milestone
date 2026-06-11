"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { CalendarDay } from "@/lib/domain/types";
import { addCheat } from "@/lib/actions";
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

export function CheatLogCard({ calendar }: { calendar: CalendarDay[] }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CheatType>("meal");
  const [label, setLabel] = useState("");

  const days = calendar.filter((day) => day.cheatLabels.length > 0);

  function run(fn: () => Promise<void>, ok: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(ok);
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
    <Card>
      <CardHeader>
        <CardTitle>Cheat log</CardTitle>
        <CardDescription>This week&apos;s cheats</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No cheats logged this week.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {days.map((day) => (
              <li key={day.date} className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">{day.date}</span>
                <div className="flex flex-wrap gap-1.5">
                  {day.cheatLabels.map((cheatLabel, index) => (
                    <Badge
                      key={`${day.date}-${index}`}
                      variant={day.cheats[index] === "drink" ? "destructive" : "secondary"}
                    >
                      {cheatLabel}
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
