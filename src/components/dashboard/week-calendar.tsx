"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CalendarDay } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const LEGEND = [
  { dotClass: "bg-chart-1", label: "Water" },
  { dotClass: "bg-orange-500", label: "Exercise" },
  { dotClass: "bg-yellow-400", label: "Small walk" },
  { dotClass: "bg-red-500", label: "Skip" },
  { dotClass: "bg-gray-400", label: "Cheat" },
] as const;

function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function WeekCalendar({ calendar }: { calendar: CalendarDay[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Preview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-7 gap-1">
          {calendar.map((day, index) => (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1.5 rounded-md py-2"
            >
              <span className="text-[10px] text-muted-foreground">
                {WEEKDAY_LABELS[index % 7]}
              </span>
              <span className="text-sm font-medium tabular-nums">
                {dayOfMonth(day.date)}
              </span>
              <div className="flex h-2 items-center gap-0.5">
                {day.waterComplete && (
                  <span className="size-1.5 rounded-full bg-chart-1" />
                )}
                {day.exerciseCompleted && (
                  <span className="size-1.5 rounded-full bg-orange-500" />
                )}
                {day.cheats.length > 0 && (
                  <span className="size-1.5 rounded-full bg-gray-400" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {LEGEND.map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <span className={cn("size-1.5 rounded-full", item.dotClass)} />
              {item.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
