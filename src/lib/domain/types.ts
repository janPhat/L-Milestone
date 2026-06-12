// Domain types for the L Health tracker. These mirror the data the server
// assembles from D1 rows; the pure functions in tracker.ts operate on them.

export type BeverageType =
  | "water"
  | "coffee"
  | "tea"
  | "sportsDrink"
  | "juice"
  | "milk"
  | "oralRehydration";

export type Intensity = "easy" | "moderate" | "hard";
export type CheatType = "meal" | "drink";
export type Readiness = "strong" | "steady" | "start";

export interface Goals {
  waterML: number;
  waterGlasses: number;
  glassML: number;
  exerciseMinutes: number;
  baselineWeightKg: number;
  targetWeightKg: number;
  baselineWaistIn: number;
  targetWaistIn: number;
}

export interface WaterEntry {
  date: string;
  amountML: number;
}

export interface HydrationEntry {
  date: string;
  amountML: number;
  presetName: string;
  beverageType: string;
  effectiveML: number;
}

export interface ExerciseEntry {
  date: string;
  minutes: number;
  intensity: string;
  label: string;
}

export interface BodyStatEntry {
  date: string;
  weightKg?: number;
  waistIn?: number;
  [key: string]: number | string | undefined;
}

export interface CheatLogEntry {
  date: string;
  type: CheatType;
  label: string;
}

export interface TrackerState {
  today: string;
  goals: Goals;
  water: WaterEntry[];
  hydrationEntries: HydrationEntry[];
  exercise: ExerciseEntry[];
  bodyStats: BodyStatEntry[];
  cheatLogs: CheatLogEntry[];
}

export interface CreateOptions {
  today?: string;
  goals?: Partial<Goals>;
}

export interface AddWaterInput {
  date: string;
  amountML: number;
  presetName?: string;
  beverageType?: string;
}

export interface MilestoneInput {
  date: string;
  glass: number;
}

export interface HydrationInput {
  date: string;
  amountML: number;
  presetName?: string;
  beverageType?: string;
}

export interface AddExerciseInput {
  date: string;
  minutes: number;
  intensity?: string;
  label?: string;
}

export interface BodyStatInput {
  date: string;
  weightKg?: number;
  waistIn?: number;
  [key: string]: number | string | undefined;
}

export interface AddCheatInput {
  date: string;
  type?: string;
  label?: string;
}

export interface DaySummary {
  date: string;
  waterML: number;
  waterProgress: number;
  exerciseMinutes: number;
  exerciseProgress: number;
  activeCaloriesEstimate: number;
  latestWeightKg: number | undefined;
  weightChangeKg: number;
  latestWaistIn: number | undefined;
  waistChangeIn: number;
  readiness: Readiness;
  nextNudge: string;
}

export interface WeekDaySummary {
  date: string;
  hydrationML: number;
  goalMet: boolean;
}

export interface Milestone {
  glass: number;
  complete: boolean;
}

export interface WaterMilestonesSummary {
  completedGlasses: number;
  totalGlasses: number;
  glassML: number;
  complete: boolean;
  milestones: Milestone[];
}

export interface CalendarDay {
  date: string;
  plannedExercise: boolean;
  exerciseCompleted: boolean;
  waterComplete: boolean;
  bodyCheckDue: boolean;
  bodyCheckCompleted: boolean;
  cheats: string[];
  cheatLabels: string[];
}

export type MovementStatus = "exercise" | "smallWalk" | "skip";

export interface MovementDay {
  date: string;
  status: MovementStatus | null;
  isToday: boolean;
}
