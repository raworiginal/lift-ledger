import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "#auth/schema";

export const MOVEMENT_PATTERNS = [
  "vertical_pull",
  "horizontal_pull",
  "vertical_push",
  "horizontal_push",
  "squat",
  "hinge",
  "carry",
  "rotation",
  "anti_rotation",
  "elbow_flexion",
  "elbow_extension",
  "knee_flexion",
  "knee_extension",
  "calf_raise",
  "shoulder_abduction",
] as const;

export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

const movementPattern = () =>
  text("movement_pattern", { enum: MOVEMENT_PATTERNS });

const inPatterns = (col: unknown) =>
  sql`${col} IN (${sql.raw(MOVEMENT_PATTERNS.map((p) => `'${p}'`).join(", "))})`;

const userId = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

export const exercises = sqliteTable(
  "exercises",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    equipment: text("equipment").notNull(),
    movementPattern: movementPattern(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [
    uniqueIndex("exercises_name_equipment_uidx").on(
      sql`${t.name} COLLATE NOCASE`,
      t.equipment,
    ),
    check("exercises_movement_pattern_chk", sql`${t.movementPattern} IS NULL OR ${inPatterns(t.movementPattern)}`),
  ],
);

export const routines = sqliteTable(
  "routines",
  {
    id: integer("id").primaryKey(),
    userId: userId(),
    name: text("name").notNull(),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("routines_user_name_uidx").on(t.userId, sql`${t.name} COLLATE NOCASE`),
  ],
);

export const routineItems = sqliteTable(
  "routine_items",
  {
    id: integer("id").primaryKey(),
    routineId: integer("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    movementPattern: movementPattern(),
    exerciseId: integer("exercise_id").references(() => exercises.id, {
      onDelete: "restrict",
    }),
    target: text("target"),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("routine_items_routine_position_uidx").on(t.routineId, t.position),
    check("routine_items_position_chk", sql`${t.position} >= 0`),
    check(
      "routine_items_slot_chk",
      sql`(${t.movementPattern} IS NULL) <> (${t.exerciseId} IS NULL)`,
    ),
    check("routine_items_movement_pattern_chk", sql`${t.movementPattern} IS NULL OR ${inPatterns(t.movementPattern)}`),
  ],
);

export const workouts = sqliteTable(
  "workouts",
  {
    id: integer("id").primaryKey(),
    userId: userId(),
    routineId: integer("routine_id").references(() => routines.id, {
      onDelete: "set null",
    }),
    startedAt: integer("started_at").notNull(),
    completedAt: integer("completed_at"),
    notes: text("notes"),
  },
  (t) => [
    index("workouts_user_started_idx").on(t.userId, t.startedAt),
    check(
      "workouts_completed_chk",
      sql`${t.completedAt} IS NULL OR ${t.completedAt} >= ${t.startedAt}`,
    ),
  ],
);

export const workoutExercises = sqliteTable(
  "workout_exercises",
  {
    id: integer("id").primaryKey(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("workout_exercises_workout_position_uidx").on(t.workoutId, t.position),
    check("workout_exercises_position_chk", sql`${t.position} >= 0`),
  ],
);

export const workoutSets = sqliteTable(
  "workout_sets",
  {
    id: integer("id").primaryKey(),
    workoutExerciseId: integer("workout_exercise_id")
      .notNull()
      .references(() => workoutExercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    reps: integer("reps").notNull(),
    load: real("load"),
    side: text("side", { enum: ["left", "right"] }),
    rir: integer("rir"),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("workout_sets_exercise_position_uidx").on(t.workoutExerciseId, t.position),
    check("workout_sets_position_chk", sql`${t.position} >= 0`),
    check("workout_sets_reps_chk", sql`${t.reps} > 0`),
    check("workout_sets_side_chk", sql`${t.side} IS NULL OR ${t.side} IN ('left', 'right')`),
    check("workout_sets_rir_chk", sql`${t.rir} IS NULL OR ${t.rir} BETWEEN 0 AND 10`),
  ],
);
