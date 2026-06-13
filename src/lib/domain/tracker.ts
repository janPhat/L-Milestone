// Pure domain logic, ported verbatim (behavior-preserving) from the original
// web/src/tracker.js. No DOM, no storage, no side effects — the server feeds
// these functions a TrackerState assembled from D1 rows, and writes use
// createHydrationEntry() to compute effectiveML at insert time.

import type {
  AddCheatInput,
  AddExerciseInput,
  AddWaterInput,
  BodyStatInput,
  CalendarDay,
  CreateOptions,
  DaySummary,
  Goals,
  HydrationEntry,
  HydrationInput,
  Intensity,
  MilestoneInput,
  MovementDay,
  MovementStatus,
  PerformancePeriod,
  PerformanceSummary,
  TrackerState,
  WaterMilestonesSummary,
  WeekDaySummary,
} from "./types";

export const DEFAULT_GOALS: Goals = {
  waterML: 2_000,
  waterGlasses: 8,
  glassML: 250,
  exerciseMinutes: 30,
  baselineWeightKg: 59.8,
  targetWeightKg: 55,
  baselineWaistIn: 31,
  targetWaistIn: 28,
  timezone: "Asia/Bangkok",
};

/**
 * The local ISO date (YYYY-MM-DD) for an instant in a given IANA time zone.
 * Pure + deterministic for a fixed instant — the basis for each user's "today".
 */
export function isoDateInTimeZone(instant: Date, timeZone: string): string {
  return instant.toLocaleDateString("en-CA", { timeZone });
}

export const CALORIES_PER_MINUTE: Record<string, number> = {
  easy: 3.5,
  moderate: 5.5,
  hard: 7.5,
};

export const BEVERAGE_MULTIPLIERS: Record<string, number> = {
  water: 1,
  coffee: 1,
  tea: 1,
  sportsDrink: 1.1,
  juice: 1.3,
  milk: 1.5,
  oralRehydration: 1.5,
};

export function createTrackerState(options: CreateOptions = {}): TrackerState {
  return {
    today: options.today ?? todayISO(),
    goals: { ...DEFAULT_GOALS, ...(options.goals ?? {}) },
    water: [],
    hydrationEntries: [],
    exercise: [],
    bodyStats: [],
    cheatLogs: [],
  };
}

export function addWater(state: TrackerState, entry: AddWaterInput): TrackerState {
  const amountML = Math.max(0, Number(entry.amountML) || 0);

  if (amountML === 0) {
    return state;
  }

  return {
    ...state,
    water: [...state.water, { date: entry.date, amountML }],
    hydrationEntries: [
      ...(state.hydrationEntries ?? []),
      createHydrationEntry({
        date: entry.date,
        amountML,
        presetName: entry.presetName ?? "Custom",
        beverageType: entry.beverageType ?? "water",
      }),
    ],
  };
}

export function completeWaterMilestone(
  state: TrackerState,
  entry: MilestoneInput,
): TrackerState {
  const totalGlasses = state.goals.waterGlasses ?? 8;
  const glassML = state.goals.glassML ?? Math.round(state.goals.waterML / totalGlasses);
  const glass = Math.min(totalGlasses, Math.max(0, Math.floor(Number(entry.glass) || 0)));

  if (glass === 0) {
    return state;
  }

  const targetML = glass * glassML;
  const currentML = hydrationTotalForDate(state, entry.date);

  return addWater(state, {
    date: entry.date,
    amountML: Math.max(0, targetML - currentML),
    presetName: `Glass ${glass}`,
    beverageType: "water",
  });
}

/**
 * Toggle target (in glasses) for a tapped water milestone: tapping a filled
 * glass (clickedGlass <= completedGlasses) clears down to clickedGlass - 1;
 * tapping an empty glass fills up to clickedGlass.
 */
export function nextWaterGlasses(clickedGlass: number, completedGlasses: number): number {
  return clickedGlass <= completedGlasses ? clickedGlass - 1 : clickedGlass;
}

export function addHydrationEntry(state: TrackerState, entry: HydrationInput): TrackerState {
  const hydrationEntry = createHydrationEntry(entry);

  if (hydrationEntry.amountML === 0) {
    return state;
  }

  return {
    ...state,
    hydrationEntries: [...(state.hydrationEntries ?? []), hydrationEntry],
  };
}

export function addExercise(state: TrackerState, entry: AddExerciseInput): TrackerState {
  const minutes = Math.max(0, Number(entry.minutes) || 0);

  if (minutes === 0) {
    return state;
  }

  return {
    ...state,
    exercise: [
      ...state.exercise,
      {
        date: entry.date,
        minutes,
        intensity: entry.intensity ?? "moderate",
        label: entry.label ?? "Exercise",
      },
    ],
  };
}

export function logBodyStats(state: TrackerState, entry: BodyStatInput): TrackerState {
  return {
    ...state,
    bodyStats: [...state.bodyStats, { ...entry }],
  };
}

export function addCheatLog(state: TrackerState, entry: AddCheatInput): TrackerState {
  const label = String(entry.label ?? "").trim();

  if (!label) {
    return state;
  }

  return {
    ...state,
    cheatLogs: [
      ...(state.cheatLogs ?? []),
      {
        date: entry.date,
        type: entry.type === "drink" ? "drink" : "meal",
        label,
      },
    ],
  };
}

// Only the numeric goal fields are bulk-updatable here (timezone is a string,
// set via its own control), so key the updates to number-valued Goals keys.
type NumericGoalKey = {
  [K in keyof Goals]: Goals[K] extends number ? K : never;
}[keyof Goals];

export function updateGoals(
  state: TrackerState,
  updates: Partial<Record<NumericGoalKey, number>>,
): TrackerState {
  const nextGoals = { ...state.goals };

  for (const [key, value] of Object.entries(updates)) {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue) && numericValue > 0) {
      nextGoals[key as NumericGoalKey] = numericValue;
    }
  }

  return {
    ...state,
    goals: nextGoals,
  };
}

export function summarizeDay(state: TrackerState, date: string = state.today): DaySummary {
  const waterML = hydrationTotalForDate(state, date);
  const exerciseMinutes = sumByDate(state.exercise, date, "minutes");
  const activeCaloriesEstimate = state.exercise
    .filter((entry) => entry.date === date)
    .reduce((total, entry) => {
      const caloriesPerMinute = CALORIES_PER_MINUTE[entry.intensity] ?? CALORIES_PER_MINUTE.moderate;
      return total + entry.minutes * caloriesPerMinute;
    }, 0);
  const latestStats = [...state.bodyStats]
    .filter((entry) => entry.date <= date)
    .sort((left, right) => left.date.localeCompare(right.date))
    .at(-1);
  const waterRemaining = Math.max(0, state.goals.waterML - waterML);
  const movementRemaining = Math.max(0, state.goals.exerciseMinutes - exerciseMinutes);

  return {
    date,
    waterML,
    waterProgress: roundRatio(waterML / state.goals.waterML),
    exerciseMinutes,
    exerciseProgress: roundRatio(exerciseMinutes / state.goals.exerciseMinutes),
    activeCaloriesEstimate: Math.round(activeCaloriesEstimate),
    latestWeightKg: latestStats?.weightKg,
    weightChangeKg: roundOne((latestStats?.weightKg ?? state.goals.baselineWeightKg) - state.goals.baselineWeightKg),
    latestWaistIn: latestStats?.waistIn,
    waistChangeIn: roundOne((latestStats?.waistIn ?? state.goals.baselineWaistIn) - state.goals.baselineWaistIn),
    readiness: readinessFor({ waterML, exerciseMinutes }, state.goals),
    nextNudge: nudgeFor({ waterRemaining, movementRemaining }),
  };
}

export function summarizeWeek(state: TrackerState, date: string = state.today): WeekDaySummary[] {
  return daysEndingOn(date, 7).map((day) => {
    const hydrationML = hydrationTotalForDate(state, day);

    return {
      date: day,
      hydrationML,
      goalMet: hydrationML >= state.goals.waterML,
    };
  });
}

export function summarizeWaterMilestones(
  state: TrackerState,
  date: string = state.today,
): WaterMilestonesSummary {
  const totalGlasses = state.goals.waterGlasses ?? 8;
  const glassML = state.goals.glassML ?? Math.round(state.goals.waterML / totalGlasses);
  const completedGlasses = Math.min(totalGlasses, Math.floor(hydrationTotalForDate(state, date) / glassML));

  return {
    completedGlasses,
    totalGlasses,
    glassML,
    complete: completedGlasses >= totalGlasses,
    milestones: Array.from({ length: totalGlasses }, (_, index) => ({
      glass: index + 1,
      complete: index < completedGlasses,
    })),
  };
}

export function summarizeCalendar(state: TrackerState, date: string = state.today): CalendarDay[] {
  return daysInWeekStartingMonday(date).map((day, index) => {
    const hydrationML = hydrationTotalForDate(state, day);
    const cheatsForDay = (state.cheatLogs ?? []).filter((entry) => entry.date === day);

    return {
      date: day,
      plannedExercise: index % 2 === 0,
      exerciseCompleted: state.exercise.some((entry) => entry.date === day),
      waterComplete: hydrationML >= state.goals.waterML,
      bodyCheckDue: index === 0,
      bodyCheckCompleted: state.bodyStats.some((entry) => entry.date === day),
      cheats: cheatsForDay.map((entry) => entry.type),
      cheatLabels: cheatsForDay.map((entry) => entry.label),
    };
  });
}

/**
 * Maps stored movement rows onto the Monday-start week containing `date`,
 * flagging which cell is today (the only one the UI lets you set).
 */
export function summarizeMovementWeek(
  rows: { date: string; status: string }[],
  today: string,
): MovementDay[] {
  const byDate = new Map(rows.map((row) => [row.date, row.status]));

  return daysInWeekStartingMonday(today).map((date) => {
    const stored = byDate.get(date);
    return {
      date,
      status:
        stored === "exercise" || stored === "smallWalk" || stored === "skip"
          ? stored
          : date < today
            ? "skip" // a past day with nothing logged counts as a skip
            : null, // today (still settable) and future days stay empty
      isToday: date === today,
    };
  });
}

/**
 * Aggregates the performance dashboard's numbers over a Mon-Sun week or the
 * full calendar month containing `today`: which days hit the water goal (for
 * the hero strip), how many days had movement (exercise or small walk — skips
 * never count), and how many cheats were logged in the window.
 */
export function summarizePerformance(
  state: TrackerState,
  movementRows: { date: string; status: string }[],
  today: string,
  period: PerformancePeriod,
): PerformanceSummary {
  const dates =
    period === "weekly" ? daysInWeekStartingMonday(today) : daysInMonthOf(today);
  const inWindow = new Set(dates);
  const statusByDate = new Map(movementRows.map((row) => [row.date, row.status]));

  const waterByDay = dates.map((date) => ({
    date,
    hit: hydrationTotalForDate(state, date) >= state.goals.waterML,
  }));

  return {
    period,
    totalDays: dates.length,
    waterDaysHit: waterByDay.filter((day) => day.hit).length,
    waterByDay,
    exerciseDays: dates.filter((date) => {
      const status = statusByDate.get(date);
      return status === "exercise" || status === "smallWalk";
    }).length,
    cheats: (state.cheatLogs ?? []).filter((cheat) => inWindow.has(cheat.date)).length,
  };
}

/**
 * Remaining distance from the current value (or the baseline, when nothing has
 * been logged yet) down to the target, rounded to one decimal and clamped at 0
 * once the target is reached. Powers the weekly body check's "X to reach
 * target" line. Assumes reduction goals (target ≤ current), as weight/waist are.
 */
export function amountToTarget(
  current: number | undefined,
  baseline: number,
  target: number,
): number {
  const value = current ?? baseline;
  const remaining = Math.round((value - target) * 10) / 10;
  return remaining > 0 ? remaining : 0;
}

/**
 * True only on the Monday of the week containing `today` — the day the weekly
 * body-stats record is due. Drives the Monday auto-popup on the dashboard.
 */
export function isBodyCheckDay(today: string): boolean {
  return daysInWeekStartingMonday(today)[0] === today;
}

/**
 * Tap-to-toggle for the movement tracker: re-tapping the active status clears
 * it (returns null); tapping a different one overwrites.
 */
export function nextMovementStatus(
  current: MovementStatus | null,
  clicked: MovementStatus,
): MovementStatus | null {
  return current === clicked ? null : clicked;
}

export function serializeTrackerState(state: TrackerState): string {
  return JSON.stringify(state);
}

export function restoreTrackerState(serialized: string, options: CreateOptions = {}): TrackerState {
  try {
    const parsed = JSON.parse(serialized) as Partial<TrackerState>;

    return {
      ...createTrackerState(options),
      ...parsed,
      goals: { ...DEFAULT_GOALS, ...(parsed.goals ?? {}) },
      water: Array.isArray(parsed.water) ? parsed.water : [],
      hydrationEntries: Array.isArray(parsed.hydrationEntries) ? parsed.hydrationEntries : [],
      exercise: Array.isArray(parsed.exercise) ? parsed.exercise : [],
      bodyStats: Array.isArray(parsed.bodyStats) ? parsed.bodyStats : [],
      cheatLogs: Array.isArray(parsed.cheatLogs) ? parsed.cheatLogs : [],
    };
  } catch {
    return createTrackerState(options);
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function sumByDate<T extends { date: string }>(entries: T[], date: string, field: keyof T): number {
  return entries
    .filter((entry) => entry.date === date)
    .reduce((total, entry) => total + (entry[field] as number), 0);
}

export function createHydrationEntry(entry: HydrationInput): HydrationEntry {
  const amountML = Math.max(0, Number(entry.amountML) || 0);
  const beverageType = entry.beverageType ?? "water";
  const multiplier = BEVERAGE_MULTIPLIERS[beverageType] ?? BEVERAGE_MULTIPLIERS.water;

  return {
    date: entry.date,
    amountML,
    presetName: entry.presetName ?? "Custom",
    beverageType,
    effectiveML: Math.round(amountML * multiplier),
  };
}

function hydrationTotalForDate(state: TrackerState, date: string): number {
  if (Array.isArray(state.hydrationEntries) && state.hydrationEntries.length > 0) {
    return state.hydrationEntries
      .filter((entry) => entry.date === date)
      .reduce((total, entry) => total + effectiveHydrationML(entry), 0);
  }

  return sumByDate(state.water ?? [], date, "amountML");
}

function effectiveHydrationML(entry: HydrationEntry): number {
  if (Number.isFinite(entry.effectiveML)) {
    return entry.effectiveML;
  }

  const multiplier = BEVERAGE_MULTIPLIERS[entry.beverageType] ?? BEVERAGE_MULTIPLIERS.water;
  return Math.round((Number(entry.amountML) || 0) * multiplier);
}

function daysEndingOn(date: string, count: number): string[] {
  const endDate = new Date(`${date}T00:00:00Z`);

  return Array.from({ length: count }, (_, index) => {
    const current = new Date(endDate);
    current.setUTCDate(endDate.getUTCDate() - (count - 1 - index));
    return current.toISOString().slice(0, 10);
  });
}

function daysInMonthOf(date: string): string[] {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  // Day 0 of the next month = last day of this month.
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, index) => `${date.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`,
  );
}

function daysInWeekStartingMonday(date: string): string[] {
  const current = new Date(`${date}T00:00:00Z`);
  const dayOfWeek = current.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(current);
  monday.setUTCDate(current.getUTCDate() - daysSinceMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

function roundRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.round(value * 1_000) / 1_000);
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function readinessFor(
  totals: { waterML: number; exerciseMinutes: number },
  goals: Goals,
): "strong" | "steady" | "start" {
  const hitWater = totals.waterML >= goals.waterML;
  const hitExercise = totals.exerciseMinutes >= goals.exerciseMinutes;

  if (hitWater && hitExercise) {
    return "strong";
  }

  if (totals.waterML > 0 || totals.exerciseMinutes > 0) {
    return "steady";
  }

  return "start";
}

function nudgeFor(remaining: { waterRemaining: number; movementRemaining: number }): string {
  if (remaining.waterRemaining === 0 && remaining.movementRemaining === 0) {
    return "Today is closed. Keep it boring and repeatable.";
  }

  const parts: string[] = [];

  if (remaining.waterRemaining > 0) {
    parts.push(`${remaining.waterRemaining} ml water`);
  }

  if (remaining.movementRemaining > 0) {
    parts.push(`${remaining.movementRemaining} min movement`);
  }

  return `Add ${parts.join(" and ")} to close today.`;
}
