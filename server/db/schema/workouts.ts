import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "#auth/schema";
import { exercises } from "./exercises";

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workoutDate: date("workout_date", { mode: "string" }).notNull(),
    focus: varchar("focus", { length: 50 }).notNull(),
    unit: text("unit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    check("workouts_unit_check", sql`${table.unit} in ('kg', 'lb')`),
    uniqueIndex("workouts_one_draft_per_user")
      .on(table.userId)
      .where(sql`completed_at is null`),
  ],
);

export const workoutExercises = pgTable(
  "workout_exercises",
  {
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({
      name: "workout_exercises_pk",
      columns: [table.workoutId, table.exerciseId],
    }),
  ],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").primaryKey(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull(),
    position: integer("position").notNull(),
    weight: numeric("weight", { precision: 6, scale: 2 }).notNull(),
    reps: integer("reps").notNull(),
  },
  (table) => [
    foreignKey({
      name: "workout_sets_workout_exercise_fk",
      columns: [table.workoutId, table.exerciseId],
      foreignColumns: [workoutExercises.workoutId, workoutExercises.exerciseId],
    }).onDelete("restrict"),
    uniqueIndex("workout_sets_workout_position_idx").on(
      table.workoutId,
      table.position,
    ),
    check("workout_sets_weight_check", sql`${table.weight} >= 0`),
    check(
      "workout_sets_reps_check",
      sql`${table.reps} > 0 and ${table.reps} <= 100`,
    ),
  ],
);
