"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { logBody } from "@/lib/actions";
import { amountToTarget } from "@/lib/domain/tracker";
import type { DaySummary, Goals } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function toTargetLabel(amount: number, unit: string) {
  return amount === 0 ? "Target reached" : `${amount} ${unit} to reach target`;
}

// ⚠️ DESIGN SESSION ONLY — forces the card visible every day, bypassing the
// Monday gate AND the once-per-Monday dismiss guard, so it can be iterated on.
// MUST be set back to false (real behavior: shows only on Bangkok Mondays)
// before any commit/deploy.
const DESIGN_ALWAYS_SHOW = false;

/**
 * The weekly body record, surfaced as a scheduled inline card under the Weekly
 * Preview. It reveals itself only on a Bangkok Monday (`bodyCheckDay`), once per
 * Monday — logging or dismissing sets a localStorage flag keyed by that Monday's
 * date so a later refresh that day doesn't keep nagging. On every other day it
 * renders nothing.
 *
 * It starts hidden and only reveals after mount (localStorage is client-only),
 * which also keeps server and first client render identical — no hydration flash.
 */
export function WeeklyBodyCheckCard({
  day,
  goals,
  today,
  bodyCheckDay,
}: {
  day: DaySummary;
  goals: Goals;
  today: string;
  bodyCheckDay: boolean;
}) {
  const [show, setShow] = useState(DESIGN_ALWAYS_SHOW);
  const [pending, startTransition] = useTransition();
  const [weightKg, setWeightKg] = useState("");
  const [waistIn, setWaistIn] = useState("");

  const storageKey = `lhealth.bodyCheck.${today}`;

  useEffect(() => {
    if (DESIGN_ALWAYS_SHOW) {
      setShow(true);
      return;
    }
    if (!bodyCheckDay) {
      setShow(false);
      return;
    }
    setShow(!localStorage.getItem(storageKey));
  }, [bodyCheckDay, storageKey]);

  function hideForThisMonday() {
    localStorage.setItem(storageKey, "1");
    setShow(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: { weightKg?: number; waistIn?: number } = {};
    if (weightKg.trim() !== "") input.weightKg = Number(weightKg);
    if (waistIn.trim() !== "") input.waistIn = Number(waistIn);
    if (input.weightKg === undefined && input.waistIn === undefined) return;

    startTransition(async () => {
      try {
        await logBody(input);
        toast.success("Body stats logged");
        setWeightKg("");
        setWaistIn("");
        hideForThisMonday();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  const canSubmit = weightKg.trim() !== "" || waistIn.trim() !== "";

  const weightToTarget = amountToTarget(
    day.latestWeightKg,
    goals.baselineWeightKg,
    goals.targetWeightKg,
  );
  const waistToTarget = amountToTarget(
    day.latestWaistIn,
    goals.baselineWaistIn,
    goals.targetWaistIn,
  );

  if (!show) return null;

  return (
    <Card className="gap-4">
      <CardHeader className="flex items-start justify-between gap-2">
        <CardTitle>Weekly body check</CardTitle>
        <button
          type="button"
          aria-label="Dismiss until next Monday"
          onClick={hideForThisMonday}
          className="-mt-3 -mr-3 rounded-md p-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <X className="size-4" />
        </button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Input
                  id="body-weight"
                  aria-label="Weight (kg)"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  disabled={pending}
                  className="w-20 no-spinner"
                />
                <span className="text-xl font-semibold text-foreground">kg</span>
              </div>
              <p
                className={cn(
                  "min-h-8 text-xs tabular-nums",
                  weightToTarget === 0 ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {toTargetLabel(weightToTarget, "kg")}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Input
                  id="body-waist"
                  aria-label="Waist (in)"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={waistIn}
                  onChange={(event) => setWaistIn(event.target.value)}
                  disabled={pending}
                  className="w-20 no-spinner"
                />
                <span className="text-xl font-semibold text-foreground">in</span>
              </div>
              <p
                className={cn(
                  "min-h-8 text-xs tabular-nums",
                  waistToTarget === 0 ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {toTargetLabel(waistToTarget, "in")}
              </p>
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
