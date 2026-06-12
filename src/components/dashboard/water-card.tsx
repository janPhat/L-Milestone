"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setWaterGlasses } from "@/lib/actions";
import { nextWaterGlasses } from "@/lib/domain/tracker";
import { cn } from "@/lib/utils";
import type { WaterMilestonesSummary } from "@/lib/domain/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WaterCard({
  milestones,
}: {
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

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle>Water</CardTitle>
          <CardDescription>
            {milestones.completedGlasses}/{milestones.totalGlasses} glasses
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
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
