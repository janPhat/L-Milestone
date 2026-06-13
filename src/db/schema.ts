import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, primaryKey } from "drizzle-orm/sqlite-core";
import * as authSchema from "./auth.schema";
import { users } from "./auth.schema";

export * from "./auth.schema";

// SQLite has no native datetime; store epoch-ms like the Better Auth tables.
const createdAtMs = (name = "created_at") =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`);

const userIdFk = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

// One row per user. Defaults mirror the original DEFAULT_GOALS.
export const goals = sqliteTable("goals", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  waterMl: integer("water_ml").notNull().default(2000),
  waterGlasses: integer("water_glasses").notNull().default(8),
  glassMl: integer("glass_ml").notNull().default(250),
  exerciseMinutes: integer("exercise_minutes").notNull().default(30),
  baselineWeightKg: real("baseline_weight_kg").notNull().default(59.8),
  targetWeightKg: real("target_weight_kg").notNull().default(55),
  baselineWaistIn: real("baseline_waist_in").notNull().default(31),
  targetWaistIn: real("target_waist_in").notNull().default(28),
  timezone: text("timezone").notNull().default("Asia/Bangkok"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()),
});

// Canonical hydration store. effectiveMl already has the beverage multiplier
// applied at write time (water/coffee/tea 1.0, sportsDrink 1.1, juice 1.3,
// milk/oralRehydration 1.5). date is an ISO yyyy-mm-dd local day.
export const hydrationEntries = sqliteTable(
  "hydration_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: userIdFk(),
    date: text("date").notNull(),
    amountMl: integer("amount_ml").notNull(),
    presetName: text("preset_name").notNull().default("Custom"),
    beverageType: text("beverage_type").notNull().default("water"),
    effectiveMl: integer("effective_ml").notNull(),
    createdAt: createdAtMs(),
  },
  (t) => [index("hydration_user_date_idx").on(t.userId, t.date)],
);

export const exerciseSessions = sqliteTable(
  "exercise_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: userIdFk(),
    date: text("date").notNull(),
    minutes: integer("minutes").notNull(),
    intensity: text("intensity", { enum: ["easy", "moderate", "hard"] })
      .notNull()
      .default("moderate"),
    label: text("label").notNull().default("Exercise"),
    createdAt: createdAtMs(),
  },
  (t) => [index("exercise_user_date_idx").on(t.userId, t.date)],
);

export const bodyStats = sqliteTable(
  "body_stats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: userIdFk(),
    date: text("date").notNull(),
    weightKg: real("weight_kg"),
    waistIn: real("waist_in"),
    createdAt: createdAtMs(),
  },
  (t) => [index("body_user_date_idx").on(t.userId, t.date)],
);

export const cheatLogs = sqliteTable(
  "cheat_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: userIdFk(),
    date: text("date").notNull(),
    type: text("type", { enum: ["meal", "drink"] }).notNull().default("meal"),
    label: text("label").notNull(),
    createdAt: createdAtMs(),
  },
  (t) => [index("cheat_user_date_idx").on(t.userId, t.date)],
);

// One status per user per day for the weekly movement tracker. Composite PK
// (user_id, date) keeps a single row per day, so the tap-to-set is an upsert.
export const movementDays = sqliteTable(
  "movement_days",
  {
    userId: userIdFk(),
    date: text("date").notNull(),
    status: text("status", { enum: ["exercise", "smallWalk", "skip"] }).notNull(),
    createdAt: createdAtMs(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);

// The full Drizzle schema (auth + domain) for drizzle(env.DB, { schema }).
export const schema = {
  ...authSchema,
  goals,
  hydrationEntries,
  exerciseSessions,
  bodyStats,
  cheatLogs,
  movementDays,
} as const;
