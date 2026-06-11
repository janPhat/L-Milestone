import { describe, expect, test } from "vitest";
import { buildTrackerState } from "./build-state";
import { summarizeDay, summarizeWaterMilestones } from "./tracker";

const today = "2026-06-06";

describe("buildTrackerState (D1 rows -> domain state)", () => {
  test("maps column names to domain keys and defaults goals when no row", () => {
    const state = buildTrackerState(
      {
        goals: null,
        hydration: [
          { date: today, amountMl: 500, presetName: "Bottle", beverageType: "water", effectiveMl: 500 },
          { date: today, amountMl: 300, presetName: "Milk", beverageType: "milk", effectiveMl: 450 },
        ],
        exercise: [{ date: today, minutes: 25, intensity: "moderate", label: "Lift" }],
        body: [{ date: today, weightKg: 59.1, waistIn: null }],
        cheats: [{ date: today, type: "meal", label: "Pizza" }],
      },
      today,
    );

    expect(state.goals.waterML).toBe(2000); // DEFAULT_GOALS

    const day = summarizeDay(state, today);
    expect(day.waterML).toBe(950); // 500 + 450 effectiveML
    expect(day.exerciseMinutes).toBe(25);
    expect(day.latestWeightKg).toBe(59.1);
    expect(day.latestWaistIn).toBeUndefined(); // SQL NULL -> undefined
  });

  test("uses the goals row and reads beverage-adjusted totals", () => {
    const state = buildTrackerState(
      {
        goals: {
          waterMl: 1500,
          waterGlasses: 6,
          glassMl: 250,
          exerciseMinutes: 20,
          baselineWeightKg: 60,
          targetWeightKg: 55,
          baselineWaistIn: 31,
          targetWaistIn: 28,
        },
        hydration: [
          { date: today, amountMl: 750, presetName: "Bottle", beverageType: "water", effectiveMl: 750 },
        ],
        exercise: [],
        body: [],
        cheats: [],
      },
      today,
    );

    expect(state.goals.waterML).toBe(1500);
    expect(summarizeDay(state, today).waterProgress).toBe(0.5); // 750 / 1500
    expect(summarizeWaterMilestones(state, today).completedGlasses).toBe(3); // floor(750/250)
  });
});
