"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PerformancePeriod, PerformanceSummary } from "@/lib/domain/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const PERIODS: PerformancePeriod[] = ["weekly", "monthly"];

export function PerformanceCard({
  weekly,
  monthly,
}: {
  weekly: PerformanceSummary;
  monthly: PerformanceSummary;
}) {
  const [period, setPeriod] = useState<PerformancePeriod>("weekly");
  const data = period === "weekly" ? weekly : monthly;

  const firstDate = data.waterByDay[0]?.date ?? "";
  const monthName = firstDate ? MONTH_NAMES[Number(firstDate.slice(5, 7)) - 1] : "";

  return (
    <Card className="gap-4">
      <CardHeader className="gap-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Performance</CardTitle>
          <div className="flex rounded-full bg-[#f0eee6] p-0.5 text-xs">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-full px-2.5 py-[3px] capitalize transition-colors",
                  period === p ? "bg-foreground text-white" : "text-gray-500",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        <div className="rounded-[12px] bg-[#4f86db14] p-3.5">
          <p className="text-xs text-[#2c5a9e]">
            Water · hit goal
            {period === "monthly" && ` · ${monthName}`}
          </p>
          <p className="flex items-baseline gap-2">
            <span className="text-[30px] font-medium text-[#2c5a9e] tabular-nums">
              {data.waterDaysHit}
            </span>
            <span className="text-chart-1">/ {data.totalDays} days</span>
          </p>
          <div className={cn("mt-2 flex", period === "weekly" ? "gap-1" : "gap-0.5")}>
            {data.waterByDay.map((day) => (
              <span
                key={day.date}
                title={day.date}
                className={cn(
                  "h-1.5 flex-1",
                  period === "weekly" ? "rounded-full" : "rounded-[2px]",
                  day.hit ? "bg-chart-1" : "bg-[#cdd9ee]",
                )}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[12px] border border-orange-500/70 bg-white p-3">
            <p className="text-xs text-gray-500">Exercise</p>
            <p className="text-xl font-medium text-[#b56b00] tabular-nums">
              {data.exerciseDays} {data.exerciseDays === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="rounded-[12px] border border-red-500/70 bg-white p-3">
            <p className="text-xs text-gray-500">Cheats</p>
            <p className="text-xl font-medium text-red-500 tabular-nums">
              {data.cheats}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
