"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addExercise } from "@/lib/actions";
import type { DaySummary, Goals } from "@/lib/domain/types";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Intensity = "easy" | "moderate" | "hard";

export function ExerciseCard({ day, goals }: { day: DaySummary; goals: Goals }) {
  const [pending, startTransition] = useTransition();
  const [minutes, setMinutes] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [label, setLabel] = useState("");

  const parsedMinutes = Number(minutes);
  const canSubmit = minutes.trim() !== "" && parsedMinutes > 0;

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
    if (!canSubmit) return;
    run(
      () =>
        addExercise({
          minutes: parsedMinutes,
          intensity,
          label: label.trim() === "" ? "Exercise" : label.trim(),
        }),
      `+${parsedMinutes} min logged`,
    );
    setMinutes("");
    setLabel("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercise</CardTitle>
        <CardDescription>
          {day.exerciseMinutes} / {goals.exerciseMinutes} min &middot;{" "}
          {day.activeCaloriesEstimate} kcal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={Math.round(day.exerciseProgress * 100)} />
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="exercise-minutes">Minutes</Label>
            <Input
              id="exercise-minutes"
              type="number"
              min={1}
              required
              inputMode="numeric"
              placeholder="30"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exercise-intensity">Intensity</Label>
            <Select
              value={intensity}
              onValueChange={(value) => setIntensity(value as Intensity)}
            >
              <SelectTrigger id="exercise-intensity" className="w-full">
                <SelectValue placeholder="Intensity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exercise-label">Activity</Label>
            <Input
              id="exercise-label"
              type="text"
              placeholder="Exercise"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending || !canSubmit}>
            Log exercise
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
