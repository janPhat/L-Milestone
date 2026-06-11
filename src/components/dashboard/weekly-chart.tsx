"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Goals, WeekDaySummary } from "@/lib/domain/types";
import { BarChart, Bar, CartesianGrid, XAxis } from "recharts";

const config = {
  hydrationML: { label: "Hydration (ml)", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function WeeklyChart({
  week,
  goals,
}: {
  week: WeekDaySummary[];
  goals: Goals;
}) {
  const data = week.map((d) => ({
    ...d,
    day: new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }),
  }));
  const daysMet = week.filter((d) => d.goalMet).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>This week</CardTitle>
        <CardDescription>Daily hydration over the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[180px] w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="hydrationML" fill="var(--color-hydrationML)" radius={4} />
          </BarChart>
        </ChartContainer>
        <p className="mt-2 text-sm text-muted-foreground">
          {daysMet}/7 days hit the {goals.waterML} ml goal
        </p>
      </CardContent>
    </Card>
  );
}
