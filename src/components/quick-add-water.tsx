"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { addHydration } from "@/lib/actions";
import { Button } from "@/components/ui/button";

const PRESETS = [150, 250, 500] as const;

export function QuickAddWater() {
  const [pending, startTransition] = useTransition();

  function add(amountML: number) {
    startTransition(async () => {
      try {
        await addHydration({ amountML });
        toast.success(`+${amountML} ml logged`);
      } catch {
        toast.error("Could not log water");
      }
    });
  }

  return (
    <div className="flex gap-2">
      {PRESETS.map((ml) => (
        <Button key={ml} variant="secondary" disabled={pending} onClick={() => add(ml)}>
          +{ml} ml
        </Button>
      ))}
    </div>
  );
}
