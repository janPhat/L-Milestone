import { eq } from "drizzle-orm";
import {
  getDb,
  goals,
  hydrationEntries,
  exerciseSessions,
  bodyStats,
  cheatLogs,
  movementDays,
  type Database,
} from "@/db";
import { requireUser } from "@/lib/dal";
import { buildTrackerState } from "@/lib/domain/build-state";
import {
  isBodyCheckDay,
  summarizeCalendar,
  summarizeDay,
  summarizeMovementWeek,
  summarizePerformance,
  summarizeWaterMilestones,
} from "@/lib/domain/tracker";
import type { TrackerState } from "@/lib/domain/types";

/**
 * The app's display timezone. L Health is invite-only / single-user, so the
 * day boundary and clock are pinned to Bangkok rather than UTC.
 */
export const APP_TIMEZONE = "Asia/Bangkok";

/** Current calendar date in APP_TIMEZONE as an ISO YYYY-MM-DD string. */
export function todayISO(): string {
  // en-CA renders as YYYY-MM-DD.
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

/** Current local time as a 24-hour HH:mm string in APP_TIMEZONE. */
export function nowTimeLabel(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
  const movementRows = await db
    .select({ date: movementDays.date, status: movementDays.status })
    .from(movementDays)
    .where(eq(movementDays.userId, user.id));
  const cheatRows = await db
    .select({
      id: cheatLogs.id,
      date: cheatLogs.date,
      type: cheatLogs.type,
      label: cheatLogs.label,
    })
    .from(cheatLogs)
    .where(eq(cheatLogs.userId, user.id));

  const calendar = summarizeCalendar(state, today);
  const weekDates = new Set(calendar.map((entry) => entry.date));

  return {
    user,
    today,
    nowLabel: nowTimeLabel(),
    goals: state.goals,
    day: summarizeDay(state, today),
    milestones: summarizeWaterMilestones(state, today),
    // Both windows are precomputed so the card's toggle flips instantly client-side.
    performance: {
      weekly: summarizePerformance(state, movementRows, today, "weekly"),
      monthly: summarizePerformance(state, movementRows, today, "monthly"),
    },
    calendar,
    movement: summarizeMovementWeek(movementRows, today),
    bodyCheckDay: isBodyCheckDay(today),
    // The week's cheat rows, carrying their ids so the UI can delete a single one.
    cheats: cheatRows
      .filter((cheat) => weekDates.has(cheat.date))
      .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1)),
  };
}
