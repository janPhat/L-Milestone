"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setMovement } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { MovementDay, MovementStatus } from "@/lib/domain/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const STATUS_TEXT: Record<MovementStatus, string> = {
  exercise: "text-orange-500",
  smallWalk: "text-yellow-400",
  skip: "text-red-500",
};

const OPTIONS: { status: MovementStatus; label: string; dot: string }[] = [
  { status: "exercise", label: "Exercise", dot: "bg-orange-500" },
  { status: "smallWalk", label: "Small walk", dot: "bg-yellow-400" },
  { status: "skip", label: "Skip", dot: "bg-red-500" },
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
        <div className="flex items-start justify-between">
          {movement.map((day, index) => (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1.5"
              title={`${WEEKDAY_LABELS[index % 7]} — ${day.status ?? "none"}`}
            >
              <span
                className={cn(
                  "text-[10px]",
                  day.isToday
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {WEEKDAY_LABELS[index % 7]}
              </span>
              <svg
                viewBox="0 0 24 24"
                className={cn(
                  "size-7",
                  day.status ? STATUS_TEXT[day.status] : "text-muted-foreground/30",
                )}
                aria-hidden="true"
              >
                {day.status ? (
                  <circle cx="12" cy="12" r="7.5" fill="currentColor" />
                ) : (
                  <circle
                    cx="12"
                    cy="12"
                    r="7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                )}
              </svg>
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
                "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-sm transition-colors disabled:opacity-50",
                todayStatus === opt.status
                  ? "border-ring bg-accent font-medium text-foreground"
                  : "border-input text-muted-foreground hover:bg-accent/50",
              )}
            >
              <span className={cn("size-2 rounded-full", opt.dot)} />
              {opt.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
