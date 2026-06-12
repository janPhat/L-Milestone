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
import { Droplet } from "lucide-react";
import { addHydration, completeMilestone } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { DaySummary, Goals, WaterMilestonesSummary } from "@/lib/domain/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";

const QUICK_ADD_ML = [150, 250, 500] as const;

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

        <div className="flex gap-2">
          {QUICK_ADD_ML.map((ml) => (
            <Button
              key={ml}
              variant="secondary"
              className="flex-1"
              disabled={pending}
              onClick={() => run(() => addHydration({ amountML: ml }), `+${ml} ml logged`)}
            >
              +{ml} ml
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
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
                  () => completeMilestone({ glass: m.glass }),
                  `Glass ${m.glass} logged`,
                )
              }
            >
              <Droplet
                className="size-8"
                fill={m.complete ? "currentColor" : "none"}
                strokeWidth={m.complete ? 0 : 1.75}
              />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
