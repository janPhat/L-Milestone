"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarRadiusAxis,
  Label,
} from "recharts";
import { setWaterGlasses } from "@/lib/actions";
import { nextWaterGlasses } from "@/lib/domain/tracker";
import { cn } from "@/lib/utils";
import type { DaySummary, Goals, WaterMilestonesSummary } from "@/lib/domain/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  value: { label: "Water" },
  water: { label: "Water", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function WaterCard({
  day,
  goals,
  milestones,
}: {
  day: DaySummary;
  goals: Goals;
  milestones: WaterMilestonesSummary;
}) {
  const [pending, startTransition] = useTransition();

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

  const pct = Math.round(day.waterProgress * 100);
  const chartData = [{ name: "water", value: pct, fill: "var(--color-water)" }];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle>Water</CardTitle>
          <CardDescription>
            {milestones.completedGlasses}/{milestones.totalGlasses} glasses
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[220px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={90 - (pct / 100) * 360}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="value" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) =>
                  viewBox && "cx" in viewBox ? (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {pct}%
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground text-sm"
                      >
                        {day.waterML} / {goals.waterML} ml
                      </tspan>
                    </text>
                  ) : null
                }
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>

        <div className="flex items-center justify-between">
          {milestones.milestones.map((m) => (
            <button
              key={m.glass}
              type="button"
              disabled={pending}
              aria-label={`Glass ${m.glass}`}
              title={`Glass ${m.glass}`}
              className={cn(
                "rounded-full p-1 transition-colors disabled:opacity-50",
                m.complete
                  ? "text-chart-1"
                  : "text-muted-foreground/30 hover:text-chart-1/60",
              )}
              onClick={() =>
                run(
                  () =>
                    setWaterGlasses({
                      glasses: nextWaterGlasses(m.glass, milestones.completedGlasses),
                    }),
                  m.complete ? `Glass ${m.glass} cleared` : `Glass ${m.glass} logged`,
                )
              }
            >
              <svg
                viewBox="0 0 24 24"
                className="size-8"
                aria-hidden="true"
                fill={m.complete ? "currentColor" : "none"}
                stroke={m.complete ? "none" : "currentColor"}
                strokeWidth={1.75}
                strokeLinejoin="round"
              >
                <path d="M12 2.5C12 2.5 19.5 11 19.5 15.5A7.5 7.5 0 0 1 4.5 15.5C4.5 11 12 2.5 12 2.5Z" />
              </svg>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
