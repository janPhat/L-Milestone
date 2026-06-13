"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setMovement } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { MovementDay, MovementStatus } from "@/lib/domain/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const STATUS_BG: Record<MovementStatus, string> = {
  exercise: "bg-orange-500",
  smallWalk: "bg-yellow-400",
  skip: "bg-gray-200",
};

const OPTIONS: { status: MovementStatus; label: string; faded: string }[] = [
  { status: "exercise", label: "Exercise", faded: "bg-orange-500/50" },
  { status: "smallWalk", label: "Small walk", faded: "bg-yellow-400/50" },
  { status: "skip", label: "Skip", faded: "bg-gray-200/50" },
];

export function ExerciseCard({ movement }: { movement: MovementDay[] }) {
  const [pending, startTransition] = useTransition();
  const todayStatus = movement.find((day) => day.isToday)?.status ?? null;

  function set(status: MovementStatus) {
    startTransition(async () => {
      try {
        await setMovement({ status });
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <Card className="gap-4">
      <CardHeader className="gap-0">
        <CardTitle>Exercise</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          {movement.map((day, index) => (
            <div
              key={day.date}
              title={`${WEEKDAY_LABELS[index % 7]} — ${day.status ?? "none"}`}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-[10px]",
                day.status
                  ? STATUS_BG[day.status]
                  : cn(
                      "border",
                      day.isToday
                        ? "border-foreground font-semibold text-foreground"
                        : "border-muted-foreground/30 text-muted-foreground",
                    ),
              )}
            >
              {day.status ? null : WEEKDAY_LABELS[index % 7]}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.status}
              type="button"
              disabled={pending}
              aria-pressed={todayStatus === opt.status}
              onClick={() => set(opt.status)}
              className={cn(
                "flex flex-1 items-center justify-center whitespace-nowrap rounded-full px-1.5 py-1.5 text-xs text-black transition-colors disabled:opacity-50 xs:text-sm",
                opt.faded,
                todayStatus === opt.status && "font-medium",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
