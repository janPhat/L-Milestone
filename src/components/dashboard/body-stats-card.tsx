"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { logBody } from "@/lib/actions";
import type { DaySummary, Goals } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function formatChange(value: number, unit: string) {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} ${unit}`;
}

export function BodyStatsCard({ day, goals }: { day: DaySummary; goals: Goals }) {
  const [pending, startTransition] = useTransition();
  const [weightKg, setWeightKg] = useState("");
  const [waistIn, setWaistIn] = useState("");

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: { weightKg?: number; waistIn?: number } = {};
    if (weightKg.trim() !== "") input.weightKg = Number(weightKg);
    if (waistIn.trim() !== "") input.waistIn = Number(waistIn);
    if (input.weightKg === undefined && input.waistIn === undefined) return;

    run(async () => {
      await logBody(input);
      setWeightKg("");
      setWaistIn("");
    }, "Body stats logged");
  }

  const canSubmit = weightKg.trim() !== "" || waistIn.trim() !== "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Body</CardTitle>
        <CardDescription>Track weight and waist against your targets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Weight</p>
            <p className="text-2xl font-semibold tabular-nums">
              {day.latestWeightKg === undefined ? "—" : day.latestWeightKg} kg
            </p>
            <p
              className={cn(
                "text-sm tabular-nums",
                day.weightChangeKg < 0 ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {formatChange(day.weightChangeKg, "kg")} vs baseline
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              Target {goals.targetWeightKg} kg
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Waist</p>
            <p className="text-2xl font-semibold tabular-nums">
              {day.latestWaistIn === undefined ? "—" : day.latestWaistIn} in
            </p>
            <p
              className={cn(
                "text-sm tabular-nums",
                day.waistChangeIn < 0 ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {formatChange(day.waistChangeIn, "in")} vs baseline
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              Target {goals.targetWaistIn} in
            </p>
          </div>
        </div>

        <Separator />

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="body-weight">Weight (kg)</Label>
              <Input
                id="body-weight"
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Optional"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body-waist">Waist (in)</Label>
              <Input
                id="body-waist"
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Optional"
                value={waistIn}
                onChange={(event) => setWaistIn(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pending || !canSubmit}>
            Log body stats
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
