import { describe, expect, test } from "vitest";
import * as tracker from "./tracker";
import {
  addExercise,
  addHydrationEntry,
  addWater,
  completeWaterMilestone,
  createTrackerState,
  logBodyStats,
  restoreTrackerState,
  serializeTrackerState,
  summarizeDay,
  summarizeWeek,
  updateGoals,
} from "./tracker";

// Ported verbatim from the original web/test/tracker.test.js (node:test) to
// lock behavior parity through the JS -> TS rewrite.
describe("tracker domain", () => {
  test("tracker state > given daily logs > then totals and readiness update", () => {
    let state = createTrackerState({
      today: "2026-06-06",
      goals: {
        waterML: 2_000,
        exerciseMinutes: 30,
        baselineWeightKg: 59.8,
        targetWeightKg: 55,
        targetWaistIn: 28,
      },
    });

    state = addWater(state, { date: "2026-06-06", amountML: 500 });
    state = addWater(state, { date: "2026-06-06", amountML: 750 });
    state = addExercise(state, {
      date: "2026-06-06",
      minutes: 25,
      intensity: "moderate",
      label: "Dumbbell full body",
    });
    state = logBodyStats(state, {
      date: "2026-06-06",
      weightKg: 59.1,
      waistIn: 30.2,
      rightArmIn: 12,
      leftArmIn: 10.4,
    });

    expect(summarizeDay(state, "2026-06-06")).toEqual({
      date: "2026-06-06",
      waterML: 1_250,
      waterProgress: 0.625,
      exerciseMinutes: 25,
      exerciseProgress: 0.833,
      activeCaloriesEstimate: 138,
      latestWeightKg: 59.1,
      weightChangeKg: -0.7,
      latestWaistIn: 30.2,
      waistChangeIn: -0.8,
      readiness: "steady",
      nextNudge: "Add 750 ml water and 5 min movement to close today.",
    });
  });

  test("tracker state > given serialized logs > then restored state keeps goals and entries", () => {
    let state = createTrackerState({
      today: "2026-06-06",
      goals: {
        waterML: 2_200,
        exerciseMinutes: 20,
        baselineWeightKg: 59.8,
        baselineWaistIn: 31,
      },
    });

    state = addWater(state, { date: "2026-06-06", amountML: 600 });
    state = addExercise(state, {
      date: "2026-06-06",
      minutes: 12,
      intensity: "easy",
      label: "Walk at home",
    });

    const restored = restoreTrackerState(serializeTrackerState(state));

    expect(summarizeDay(restored, "2026-06-06")).toEqual({
      date: "2026-06-06",
      waterML: 600,
      waterProgress: 0.273,
      exerciseMinutes: 12,
      exerciseProgress: 0.6,
      activeCaloriesEstimate: 42,
      latestWeightKg: undefined,
      weightChangeKg: 0,
      latestWaistIn: undefined,
      waistChangeIn: 0,
      readiness: "steady",
      nextNudge: "Add 1600 ml water and 8 min movement to close today.",
    });
  });

  test("tracker goals > given edited targets > then summaries use the new daily goals", () => {
    let state = createTrackerState({ today: "2026-06-06" });

    state = updateGoals(state, {
      waterML: 1_500,
      exerciseMinutes: 20,
      targetWeightKg: 54,
      targetWaistIn: 27,
    });
    state = addWater(state, { date: "2026-06-06", amountML: 750 });
    state = addExercise(state, {
      date: "2026-06-06",
      minutes: 10,
      intensity: "easy",
      label: "Recovery walk",
    });

    const summary = summarizeDay(state, "2026-06-06");

    expect(summary.waterProgress).toBe(0.5);
    expect(summary.exerciseProgress).toBe(0.5);
    expect(summary.nextNudge).toBe("Add 750 ml water and 10 min movement to close today.");
    expect(state.goals.targetWeightKg).toBe(54);
    expect(state.goals.targetWaistIn).toBe(27);
  });

  test("hydration backend > given beverage entries > then effective daily and weekly summaries are calculated", () => {
    let state = createTrackerState({
      today: "2026-06-06",
      goals: { waterML: 2_000 },
    });

    state = addHydrationEntry(state, {
      date: "2026-06-02",
      amountML: 500,
      presetName: "Water Bottle",
      beverageType: "water",
    });
    state = addHydrationEntry(state, {
      date: "2026-06-03",
      amountML: 300,
      presetName: "Milk",
      beverageType: "milk",
    });
    state = addHydrationEntry(state, {
      date: "2026-06-06",
      amountML: 750,
      presetName: "Large Bottle",
      beverageType: "sportsDrink",
    });

    expect(summarizeDay(state, "2026-06-06")).toEqual({
      date: "2026-06-06",
      waterML: 825,
      waterProgress: 0.413,
      exerciseMinutes: 0,
      exerciseProgress: 0,
      activeCaloriesEstimate: 0,
      latestWeightKg: undefined,
      weightChangeKg: 0,
      latestWaistIn: undefined,
      waistChangeIn: 0,
      readiness: "steady",
      nextNudge: "Add 1175 ml water and 30 min movement to close today.",
    });
    expect(summarizeWeek(state, "2026-06-06")).toEqual([
      { date: "2026-05-31", hydrationML: 0, goalMet: false },
      { date: "2026-06-01", hydrationML: 0, goalMet: false },
      { date: "2026-06-02", hydrationML: 500, goalMet: false },
      { date: "2026-06-03", hydrationML: 450, goalMet: false },
      { date: "2026-06-04", hydrationML: 0, goalMet: false },
      { date: "2026-06-05", hydrationML: 0, goalMet: false },
      { date: "2026-06-06", hydrationML: 825, goalMet: false },
    ]);
  });

  test("water milestones > given clicked glass > then state fills up to that glass without double counting", () => {
    let state = createTrackerState({
      today: "2026-06-06",
      goals: { waterML: 2_000, waterGlasses: 8, glassML: 250 },
    });

    state = addWater(state, { date: "2026-06-06", amountML: 500 });
    state = completeWaterMilestone(state, { date: "2026-06-06", glass: 5 });

    expect(summarizeDay(state, "2026-06-06").waterML).toBe(1_250);
    expect(tracker.summarizeWaterMilestones(state, "2026-06-06").completedGlasses).toBe(5);

    state = completeWaterMilestone(state, { date: "2026-06-06", glass: 3 });

    expect(summarizeDay(state, "2026-06-06").waterML).toBe(1_250);
  });

  test("water milestone toggle > tap a filled glass to clear it, tap an empty glass to fill to it", () => {
    expect(tracker.nextWaterGlasses(3, 5)).toBe(2); // glass 3 filled -> clear down to 2
    expect(tracker.nextWaterGlasses(5, 5)).toBe(4); // tap the last filled glass -> remove it
    expect(tracker.nextWaterGlasses(6, 5)).toBe(6); // glass 6 empty -> fill up to 6
    expect(tracker.nextWaterGlasses(1, 0)).toBe(1); // nothing filled -> fill first glass
    expect(tracker.nextWaterGlasses(1, 1)).toBe(0); // only glass filled -> clear to 0
  });

  test("movement week > maps statuses onto Mon-Sun; past empty days default to skip", () => {
    const week = tracker.summarizeMovementWeek(
      [{ date: "2026-06-08", status: "exercise" }],
      "2026-06-12",
    );
    expect(week.map((d) => d.date)).toEqual([
      "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11",
      "2026-06-12", "2026-06-13", "2026-06-14",
    ]);
    // Mon logged exercise; Tue-Thu are past + empty -> skip; Fri (today) and
    // Sat/Sun (future) stay empty.
    expect(week.map((d) => d.status)).toEqual([
      "exercise", "skip", "skip", "skip", null, null, null,
    ]);
    expect(week.filter((d) => d.isToday).map((d) => d.date)).toEqual(["2026-06-12"]);
  });

  test("movement toggle > re-tapping the active status clears it, a new one overwrites", () => {
    expect(tracker.nextMovementStatus(null, "exercise")).toBe("exercise");
    expect(tracker.nextMovementStatus("exercise", "exercise")).toBeNull();
    expect(tracker.nextMovementStatus("exercise", "skip")).toBe("skip");
  });

  test("weekly habit system > given logs > then milestones, monday body check, cheats, and calendar are reported", () => {
    expect(typeof tracker.addCheatLog).toBe("function");
    expect(typeof tracker.summarizeWaterMilestones).toBe("function");
    expect(typeof tracker.summarizeCalendar).toBe("function");

    let state = createTrackerState({
      today: "2026-06-06",
      goals: { waterML: 2_000 },
    });

    state = addWater(state, { date: "2026-06-03", amountML: 2_000 });
    state = addWater(state, { date: "2026-06-06", amountML: 1_250 });
    state = addExercise(state, {
      date: "2026-06-03",
      minutes: 30,
      intensity: "moderate",
      label: "Dumbbell full body",
    });
    state = tracker.addCheatLog(state, { date: "2026-06-05", type: "meal", label: "Pizza dinner" });
    state = tracker.addCheatLog(state, { date: "2026-06-05", type: "drink", label: "Pepsi Zero" });
    state = logBodyStats(state, { date: "2026-06-01", weightKg: 59.3, waistIn: 30.5 });

    expect(tracker.summarizeWaterMilestones(state, "2026-06-06")).toEqual({
      completedGlasses: 5,
      totalGlasses: 8,
      glassML: 250,
      complete: false,
      milestones: [
        { glass: 1, complete: true },
        { glass: 2, complete: true },
        { glass: 3, complete: true },
        { glass: 4, complete: true },
        { glass: 5, complete: true },
        { glass: 6, complete: false },
        { glass: 7, complete: false },
        { glass: 8, complete: false },
      ],
    });

    expect(
      tracker.summarizeCalendar(state, "2026-06-06").map((day) => ({
        date: day.date,
        plannedExercise: day.plannedExercise,
        exerciseCompleted: day.exerciseCompleted,
        waterComplete: day.waterComplete,
        bodyCheckDue: day.bodyCheckDue,
        bodyCheckCompleted: day.bodyCheckCompleted,
        cheats: day.cheats,
      })),
    ).toEqual([
      { date: "2026-06-01", plannedExercise: true, exerciseCompleted: false, waterComplete: false, bodyCheckDue: true, bodyCheckCompleted: true, cheats: [] },
      { date: "2026-06-02", plannedExercise: false, exerciseCompleted: false, waterComplete: false, bodyCheckDue: false, bodyCheckCompleted: false, cheats: [] },
      { date: "2026-06-03", plannedExercise: true, exerciseCompleted: true, waterComplete: true, bodyCheckDue: false, bodyCheckCompleted: false, cheats: [] },
      { date: "2026-06-04", plannedExercise: false, exerciseCompleted: false, waterComplete: false, bodyCheckDue: false, bodyCheckCompleted: false, cheats: [] },
      { date: "2026-06-05", plannedExercise: true, exerciseCompleted: false, waterComplete: false, bodyCheckDue: false, bodyCheckCompleted: false, cheats: ["meal", "drink"] },
      { date: "2026-06-06", plannedExercise: false, exerciseCompleted: false, waterComplete: false, bodyCheckDue: false, bodyCheckCompleted: false, cheats: [] },
      { date: "2026-06-07", plannedExercise: true, exerciseCompleted: false, waterComplete: false, bodyCheckDue: false, bodyCheckCompleted: false, cheats: [] },
    ]);
  });
});
