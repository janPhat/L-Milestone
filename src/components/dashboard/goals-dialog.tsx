"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Goals } from "@/lib/domain/types";
import { updateGoals } from "@/lib/actions";
import { Button } from "@/components/ui/button";
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

export function GoalsDialog({ goals }: { goals: Goals }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [waterGlasses, setWaterGlasses] = useState(String(goals.waterGlasses));
  const [targetWeightKg, setTargetWeightKg] = useState(String(goals.targetWeightKg));
  const [targetWaistIn, setTargetWaistIn] = useState(String(goals.targetWaistIn));

  function run(fn: () => Promise<void>, ok: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(ok);
        setOpen(false);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const updates: Parameters<typeof updateGoals>[0] = {};
    const glasses = Number(waterGlasses);
    const weight = Number(targetWeightKg);
    const waist = Number(targetWaistIn);

    if (glasses > 0 && glasses !== goals.waterGlasses) updates.waterGlasses = glasses;
    if (weight > 0 && weight !== goals.targetWeightKg) updates.targetWeightKg = weight;
    if (waist > 0 && waist !== goals.targetWaistIn) updates.targetWaistIn = waist;

    if (Object.keys(updates).length === 0) {
      toast.error("No goal changes to save");
      return;
    }

    run(() => updateGoals(updates), "Goals updated");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="bg-chart-1 text-white hover:bg-chart-1/80">
          Edit goals
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit goals</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update your daily targets. Only changed values are saved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="goal-glasses">Glasses</Label>
            <Input
              id="goal-glasses"
              className="no-spinner"
              type="number"
              min={1}
              value={waterGlasses}
              onChange={(event) => setWaterGlasses(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal-target-weight">Target weight (kg)</Label>
            <Input
              id="goal-target-weight"
              className="no-spinner"
              type="number"
              min={1}
              step="0.1"
              value={targetWeightKg}
              onChange={(event) => setTargetWeightKg(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goal-target-waist">Target waist (in)</Label>
            <Input
              id="goal-target-waist"
              className="no-spinner"
              type="number"
              min={1}
              step="0.1"
              value={targetWaistIn}
              onChange={(event) => setTargetWaistIn(event.target.value)}
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              Save goals
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
