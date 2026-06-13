"use server";

import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  getDb,
  goals,
  hydrationEntries,
  exerciseSessions,
  bodyStats,
  cheatLogs,
  movementDays,
  invites,
  users,
  sessions,
  accounts,
} from "@/db";
import { requireUser } from "@/lib/dal";
import { createHydrationEntry, nextMovementStatus } from "@/lib/domain/tracker";
import { generateInviteCode, normalizeInviteCode } from "@/lib/domain/invite";
import { todayISO, userTimezone } from "@/lib/tracker-data";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
  .optional();

const beverageType = z
  .enum(["water", "coffee", "tea", "sportsDrink", "juice", "milk", "oralRehydration"])
  .default("water");

const hydrationSchema = z.object({
  date: isoDate,
  amountML: z.coerce.number().int().positive().max(10_000),
  beverageType,
  presetName: z.string().trim().min(1).max(40).default("Custom"),
});

const milestoneSchema = z.object({ date: isoDate, glass: z.coerce.number().int().min(1).max(20) });

const setGlassesSchema = z.object({ date: isoDate, glasses: z.coerce.number().int().min(0).max(20) });

const exerciseSchema = z.object({
  date: isoDate,
  minutes: z.coerce.number().int().positive().max(1_000),
  intensity: z.enum(["easy", "moderate", "hard"]).default("moderate"),
  label: z.string().trim().min(1).max(80).default("Exercise"),
});

const bodySchema = z
  .object({
    date: isoDate,
    weightKg: z.coerce.number().positive().max(500).optional(),
    waistIn: z.coerce.number().positive().max(120).optional(),
  })
  .refine((v) => v.weightKg !== undefined || v.waistIn !== undefined, {
    message: "Provide weight or waist",
  });

const cheatSchema = z.object({
  date: isoDate,
  type: z.enum(["meal", "drink"]).default("meal"),
  label: z.string().trim().min(1).max(80),
});

// Only positive numeric goal fields can be set (mirrors domain updateGoals).
const goalsSchema = z
  .object({
    waterMl: z.coerce.number().positive(),
    waterGlasses: z.coerce.number().int().positive(),
    glassMl: z.coerce.number().positive(),
    exerciseMinutes: z.coerce.number().positive(),
    baselineWeightKg: z.coerce.number().positive(),
    targetWeightKg: z.coerce.number().positive(),
    baselineWaistIn: z.coerce.number().positive(),
    targetWaistIn: z.coerce.number().positive(),
    timezone: z.string().refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "invalid IANA time zone"),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "No goal fields to update" });

export async function addHydration(input: z.input<typeof hydrationSchema>) {
  const { date, amountML, beverageType, presetName } = hydrationSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();
  const day = date ?? todayISO(await userTimezone(db, user.id));
  const entry = createHydrationEntry({ date: day, amountML, beverageType, presetName });

  await db.insert(hydrationEntries).values({
    userId: user.id,
    date: entry.date,
    amountMl: entry.amountML,
    presetName: entry.presetName,
    beverageType: entry.beverageType,
    effectiveMl: entry.effectiveML,
  });
  revalidatePath("/dashboard");
}

export async function completeMilestone(input: z.input<typeof milestoneSchema>) {
  const { date, glass } = milestoneSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();
  const day = date ?? todayISO(await userTimezone(db, user.id));

  const [goalsRow] = await db.select().from(goals).where(eq(goals.userId, user.id));
  const glassMl = goalsRow?.glassMl ?? 250;

  const dayEntries = await db
    .select({ effectiveMl: hydrationEntries.effectiveMl })
    .from(hydrationEntries)
    .where(and(eq(hydrationEntries.userId, user.id), eq(hydrationEntries.date, day)));
  const currentMl = dayEntries.reduce((total, row) => total + row.effectiveMl, 0);

  // Delta-only fill (no double counting), matching domain completeWaterMilestone.
  const deltaMl = Math.max(0, glass * glassMl - currentMl);
  if (deltaMl > 0) {
    await db.insert(hydrationEntries).values({
      userId: user.id,
      date: day,
      amountMl: deltaMl,
      presetName: `Glass ${glass}`,
      beverageType: "water",
      effectiveMl: deltaMl,
    });
    revalidatePath("/dashboard");
  }
}

// Sets the day's water to exactly `glasses` (fills or clears). Water is logged
// only via the milestone drops, so replacing the day's hydration is safe and
// lets a tap un-fill as well as fill.
export async function setWaterGlasses(input: z.input<typeof setGlassesSchema>) {
  const { date, glasses } = setGlassesSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();
  const day = date ?? todayISO(await userTimezone(db, user.id));

  const [goalsRow] = await db.select().from(goals).where(eq(goals.userId, user.id));
  const glassMl = goalsRow?.glassMl ?? 250;
  const targetMl = glasses * glassMl;

  const clearDay = db
    .delete(hydrationEntries)
    .where(and(eq(hydrationEntries.userId, user.id), eq(hydrationEntries.date, day)));

  if (targetMl > 0) {
    await db.batch([
      clearDay,
      db.insert(hydrationEntries).values({
        userId: user.id,
        date: day,
        amountMl: targetMl,
        presetName: `${glasses} glasses`,
        beverageType: "water",
        effectiveMl: targetMl,
      }),
    ]);
  } else {
    await clearDay;
  }
  revalidatePath("/dashboard");
}

const movementSchema = z.object({ status: z.enum(["exercise", "smallWalk", "skip"]) });

// Sets today's movement status. The date is server-derived, so only today can
// change; re-tapping the active status clears it (delete), a new one overwrites.
export async function setMovement(input: z.input<typeof movementSchema>) {
  const { status } = movementSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();
  const day = todayISO(await userTimezone(db, user.id));

  const [row] = await db
    .select({ status: movementDays.status })
    .from(movementDays)
    .where(and(eq(movementDays.userId, user.id), eq(movementDays.date, day)));

  const next = nextMovementStatus(row?.status ?? null, status);
  if (next === null) {
    await db
      .delete(movementDays)
      .where(and(eq(movementDays.userId, user.id), eq(movementDays.date, day)));
  } else {
    await db
      .insert(movementDays)
      .values({ userId: user.id, date: day, status: next })
      .onConflictDoUpdate({
        target: [movementDays.userId, movementDays.date],
        set: { status: next },
      });
  }
  revalidatePath("/dashboard");
}

export async function addExercise(input: z.input<typeof exerciseSchema>) {
  const { date, minutes, intensity, label } = exerciseSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();
  const day = date ?? todayISO(await userTimezone(db, user.id));

  await db.insert(exerciseSessions).values({
    userId: user.id,
    date: day,
    minutes,
    intensity,
    label,
  });
  revalidatePath("/dashboard");
}

export async function logBody(input: z.input<typeof bodySchema>) {
  const { date, weightKg, waistIn } = bodySchema.parse(input);
  const user = await requireUser();
  const db = await getDb();
  const day = date ?? todayISO(await userTimezone(db, user.id));

  await db.insert(bodyStats).values({
    userId: user.id,
    date: day,
    weightKg: weightKg ?? null,
    waistIn: waistIn ?? null,
  });
  revalidatePath("/dashboard");
}

export async function addCheat(input: z.input<typeof cheatSchema>) {
  const { date, type, label } = cheatSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();
  const day = date ?? todayISO(await userTimezone(db, user.id));

  await db.insert(cheatLogs).values({
    userId: user.id,
    date: day,
    type,
    label,
  });
  revalidatePath("/dashboard");
}

const deleteCheatSchema = z.object({ id: z.coerce.number().int().positive() });

export async function deleteCheat(input: z.input<typeof deleteCheatSchema>) {
  const { id } = deleteCheatSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();

  // Scope the delete to the signed-in user so a client can't remove others' rows.
  await db
    .delete(cheatLogs)
    .where(and(eq(cheatLogs.id, id), eq(cheatLogs.userId, user.id)));
  revalidatePath("/dashboard");
}

export async function updateGoals(input: z.input<typeof goalsSchema>) {
  const updates = goalsSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();

  // Insert fills missing columns from table defaults; on conflict, set only the
  // provided fields.
  await db
    .insert(goals)
    .values({ userId: user.id, ...updates })
    .onConflictDoUpdate({ target: goals.userId, set: updates });
  revalidatePath("/dashboard");
}

/**
 * Permanently deletes the signed-in user and ALL their data. FK cascades from
 * `users` would suffice, but we also clear every child table explicitly (in
 * child-before-parent order) so deletion is complete even if FK enforcement is
 * ever off. Irreversible — the UI gates this behind a typed confirmation.
 */
export async function deleteAccount() {
  const user = await requireUser();
  const db = await getDb();

  await db.batch([
    db.delete(hydrationEntries).where(eq(hydrationEntries.userId, user.id)),
    db.delete(exerciseSessions).where(eq(exerciseSessions.userId, user.id)),
    db.delete(bodyStats).where(eq(bodyStats.userId, user.id)),
    db.delete(cheatLogs).where(eq(cheatLogs.userId, user.id)),
    db.delete(movementDays).where(eq(movementDays.userId, user.id)),
    db.delete(goals).where(eq(goals.userId, user.id)),
    // Invites this user created go away; invites they redeemed stay (spent) but
    // lose the now-dangling redeemer reference (mirrors the FK set-null).
    db.update(invites).set({ usedByUserId: null }).where(eq(invites.usedByUserId, user.id)),
    db.delete(invites).where(eq(invites.createdByUserId, user.id)),
    db.delete(sessions).where(eq(sessions.userId, user.id)),
    db.delete(accounts).where(eq(accounts.userId, user.id)),
    db.delete(users).where(eq(users.id, user.id)),
  ]);
}

/** A signed-in user's invite, flattened for the client (epoch-ms timestamps). */
export type InviteSummary = {
  code: string;
  note: string | null;
  createdAt: number;
  usedAt: number | null;
  revokedAt: number | null;
};

const createInviteSchema = z.object({
  note: z.string().trim().max(60).optional(),
});

/** Mints a fresh single-use code owned by the signed-in user; returns the code. */
export async function createInvite(
  input?: z.input<typeof createInviteSchema>,
): Promise<string> {
  const { note } = createInviteSchema.parse(input ?? {});
  const user = await requireUser();
  const db = await getDb();

  const code = generateInviteCode();
  await db.insert(invites).values({
    code,
    createdByUserId: user.id,
    note: note && note.length > 0 ? note : null,
  });
  revalidatePath("/dashboard");
  return code;
}

/** Lists the invites the signed-in user created, newest first. */
export async function listInvites(): Promise<InviteSummary[]> {
  const user = await requireUser();
  const db = await getDb();

  const rows = await db
    .select()
    .from(invites)
    .where(eq(invites.createdByUserId, user.id))
    .orderBy(desc(invites.createdAt));

  return rows.map((row) => ({
    code: row.code,
    note: row.note,
    createdAt: row.createdAt.getTime(),
    usedAt: row.usedAt ? row.usedAt.getTime() : null,
    revokedAt: row.revokedAt ? row.revokedAt.getTime() : null,
  }));
}

const revokeInviteSchema = z.object({ code: z.string().trim().min(1) });

/**
 * Revokes one of the user's own codes — only if it's still unused and not
 * already revoked. Scoped to the creator so no one can revoke another's code.
 */
export async function revokeInvite(input: z.input<typeof revokeInviteSchema>) {
  const { code } = revokeInviteSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();

  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(invites.code, normalizeInviteCode(code)),
        eq(invites.createdByUserId, user.id),
        isNull(invites.usedAt),
        isNull(invites.revokedAt),
      ),
    );
  revalidatePath("/dashboard");
}
