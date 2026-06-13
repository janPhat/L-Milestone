import { DEFAULT_GOALS } from "./tracker";
import type { Goals, TrackerState } from "./types";

// Minimal row shapes (structurally satisfied by the Drizzle selects). Kept
// server-free so the mapping can be unit-tested without pulling in D1/Next.
interface GoalsRow {
  waterMl: number;
  waterGlasses: number;
  glassMl: number;
  exerciseMinutes: number;
  baselineWeightKg: number;
  targetWeightKg: number;
  baselineWaistIn: number;
  targetWaistIn: number;
  timezone: string;
}
interface HydrationRow {
  date: string;
  amountMl: number;
  presetName: string;
  beverageType: string;
  effectiveMl: number;
}
interface ExerciseRow {
  date: string;
  minutes: number;
  intensity: string;
  label: string;
}
interface BodyRow {
  date: string;
  weightKg: number | null;
  waistIn: number | null;
}
interface CheatRow {
  date: string;
  type: string;
  label: string;
}

export interface TrackerRows {
  goals: GoalsRow | null;
  hydration: HydrationRow[];
  exercise: ExerciseRow[];
  body: BodyRow[];
  cheats: CheatRow[];
}

/**
 * Pure mapping from D1 rows to the domain TrackerState. Column names (camelCase
 * with Ml/Kg/In, e.g. waterMl) map to the domain's ML-suffixed keys.
 */
export function buildTrackerState(rows: TrackerRows, today: string): TrackerState {
  const goals: Goals = rows.goals
    ? {
        waterML: rows.goals.waterMl,
        waterGlasses: rows.goals.waterGlasses,
        glassML: rows.goals.glassMl,
        exerciseMinutes: rows.goals.exerciseMinutes,
        baselineWeightKg: rows.goals.baselineWeightKg,
        targetWeightKg: rows.goals.targetWeightKg,
        baselineWaistIn: rows.goals.baselineWaistIn,
        targetWaistIn: rows.goals.targetWaistIn,
        timezone: rows.goals.timezone,
      }
    : { ...DEFAULT_GOALS };

  return {
    today,
    goals,
    water: [], // canonical store is hydrationEntries; water[] is the legacy fallback
    hydrationEntries: rows.hydration.map((h) => ({
      date: h.date,
      amountML: h.amountMl,
      presetName: h.presetName,
      beverageType: h.beverageType,
      effectiveML: h.effectiveMl,
    })),
    exercise: rows.exercise.map((e) => ({
      date: e.date,
      minutes: e.minutes,
      intensity: e.intensity,
      label: e.label,
    })),
    bodyStats: rows.body.map((b) => ({
      date: b.date,
      weightKg: b.weightKg ?? undefined,
      waistIn: b.waistIn ?? undefined,
    })),
    cheatLogs: rows.cheats.map((c) => ({
      date: c.date,
      type: c.type === "drink" ? "drink" : "meal",
      label: c.label,
    })),
  };
}
