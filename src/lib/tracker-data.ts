import { eq } from "drizzle-orm";
import {
  getDb,
  goals,
  hydrationEntries,
  exerciseSessions,
  bodyStats,
  cheatLogs,
  type Database,
} from "@/db";
import { requireUser } from "@/lib/dal";
import { buildTrackerState } from "@/lib/domain/build-state";
import {
  summarizeCalendar,
  summarizeDay,
  summarizeWaterMilestones,
  summarizeWeek,
} from "@/lib/domain/tracker";
import type { TrackerState } from "@/lib/domain/types";

/** Server-side "today" as a UTC ISO date (matches the domain date helpers). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Loads every row for a user and assembles a TrackerState. */
export async function loadTrackerState(
  db: Database,
  userId: string,
  today: string,
): Promise<TrackerState> {
  const [goalsRow] = await db.select().from(goals).where(eq(goals.userId, userId));
  const [hydration, exercise, body, cheats] = await Promise.all([
    db.select().from(hydrationEntries).where(eq(hydrationEntries.userId, userId)),
    db.select().from(exerciseSessions).where(eq(exerciseSessions.userId, userId)),
    db.select().from(bodyStats).where(eq(bodyStats.userId, userId)),
    db.select().from(cheatLogs).where(eq(cheatLogs.userId, userId)),
  ]);

  return buildTrackerState(
    { goals: goalsRow ?? null, hydration, exercise, body, cheats },
    today,
  );
}

/** RSC entry point: authenticated user's tracker, summarized for today. */
export async function getDashboardData() {
  const user = await requireUser();
  const db = await getDb();
  const today = todayISO();
  const state = await loadTrackerState(db, user.id, today);

  return {
    user,
    today,
    goals: state.goals,
    day: summarizeDay(state, today),
    week: summarizeWeek(state, today),
    milestones: summarizeWaterMilestones(state, today),
    calendar: summarizeCalendar(state, today),
  };
}
