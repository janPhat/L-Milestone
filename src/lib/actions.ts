"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  getDb,
  goals,
  hydrationEntries,
  exerciseSessions,
  bodyStats,
  cheatLogs,
} from "@/db";
import { requireUser } from "@/lib/dal";
import { createHydrationEntry } from "@/lib/domain/tracker";
import { todayISO } from "@/lib/tracker-data";

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
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "No goal fields to update" });

export async function addHydration(input: z.input<typeof hydrationSchema>) {
  const { date, amountML, beverageType, presetName } = hydrationSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();
  const entry = createHydrationEntry({ date: date ?? todayISO(), amountML, beverageType, presetName });

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
  const day = date ?? todayISO();
  const user = await requireUser();
  const db = await getDb();

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
  const day = date ?? todayISO();
  const user = await requireUser();
  const db = await getDb();

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

export async function addExercise(input: z.input<typeof exerciseSchema>) {
  const { date, minutes, intensity, label } = exerciseSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();

  await db.insert(exerciseSessions).values({
    userId: user.id,
    date: date ?? todayISO(),
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

  await db.insert(bodyStats).values({
    userId: user.id,
    date: date ?? todayISO(),
    weightKg: weightKg ?? null,
    waistIn: waistIn ?? null,
  });
  revalidatePath("/dashboard");
}

export async function addCheat(input: z.input<typeof cheatSchema>) {
  const { date, type, label } = cheatSchema.parse(input);
  const user = await requireUser();
  const db = await getDb();

  await db.insert(cheatLogs).values({
    userId: user.id,
    date: date ?? todayISO(),
    type,
    label,
  });
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
