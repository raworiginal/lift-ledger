import { sql } from "drizzle-orm";
import {
  check,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "#auth/schema";
import { workoutUnit } from "./workouts";

export const trainingPreferences = pgTable(
  "training_preferences",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    repMin: integer("rep_min").notNull().default(8),
    repMax: integer("rep_max").notNull().default(12),
    unit: workoutUnit("unit").notNull().default("lb"),
    weightStep: numeric("weight_step", { precision: 5, scale: 2 })
      .notNull()
      .default("5"),
    restTimeSeconds: integer("rest_time_seconds").notNull().default(120),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "training_preferences_rep_range_check",
      sql`${table.repMin} >= 1 and ${table.repMin} < ${table.repMax} and ${table.repMax} <= 100`,
    ),
    check(
      "training_preferences_weight_step_check",
      sql`${table.weightStep} > 0`,
    ),
    check(
      "training_preferences_rest_time_check",
      sql`${table.restTimeSeconds} >= 0 and ${table.restTimeSeconds} <= 3600`,
    ),
  ],
);
