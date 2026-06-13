import { eq } from "drizzle-orm";
import {
  getDb,
  goals,
  hydrationEntries,
  exerciseSessions,
  bodyStats,
  cheatLogs,
  movementDays,
} from "@/db";
import { getSession } from "@/lib/dal";

// GET /api/export — downloads everything the signed-in user has, as JSON.
// Every query is scoped to the server-derived user id (no client input).
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = await getDb();
  const userId = session.user.id;

  const [goalsRows, hydration, exercise, body, cheats, movement] = await Promise.all([
    db.select().from(goals).where(eq(goals.userId, userId)),
    db.select().from(hydrationEntries).where(eq(hydrationEntries.userId, userId)),
    db.select().from(exerciseSessions).where(eq(exerciseSessions.userId, userId)),
    db.select().from(bodyStats).where(eq(bodyStats.userId, userId)),
    db.select().from(cheatLogs).where(eq(cheatLogs.userId, userId)),
    db.select().from(movementDays).where(eq(movementDays.userId, userId)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    goals: goalsRows[0] ?? null,
    hydrationEntries: hydration,
    exerciseSessions: exercise,
    bodyStats: body,
    cheatLogs: cheats,
    movementDays: movement,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="l-health-export.json"',
      "cache-control": "no-store",
    },
  });
}
