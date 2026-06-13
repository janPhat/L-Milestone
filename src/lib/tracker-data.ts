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
  isoDateInTimeZone,
  summarizeCalendar,
  summarizeDay,
  summarizeMovementWeek,
  summarizePerformance,
  summarizeWaterMilestones,
} from "@/lib/domain/tracker";
import type { TrackerState } from "@/lib/domain/types";

/** Day-boundary / clock time zone used when a user hasn't set their own. */
export const DEFAULT_TIMEZONE = "Asia/Bangkok";

/** Current calendar date (YYYY-MM-DD) in the given IANA time zone. */
export function todayISO(timeZone: string = DEFAULT_TIMEZONE): string {
  return isoDateInTimeZone(new Date(), timeZone);
}

/** Current local time as a 24-hour HH:mm string in the given time zone. */
export function nowTimeLabel(timeZone: string = DEFAULT_TIMEZONE): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** The signed-in user's stored IANA time zone (DEFAULT_TIMEZONE if unset). */
export async function userTimezone(db: Database, userId: string): Promise<string> {
  const [row] = await db
    .select({ timezone: goals.timezone })
    .from(goals)
    .where(eq(goals.userId, userId));
  return row?.timezone ?? DEFAULT_TIMEZONE;
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
  const timezone = await userTimezone(db, user.id);
  const today = todayISO(timezone);
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
    nowLabel: nowTimeLabel(timezone),
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
