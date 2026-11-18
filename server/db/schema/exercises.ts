import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
} from "drizzle-orm/pg-core";

export type LocalizedLists = {
  en: string[];
  de: string[];
  es: string[];
};

export type ExerciseImages = Record<string, Record<string, string>>;

export const exercises = pgTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    nameEn: text("name_en").notNull(),
    nameDe: text("name_de").notNull(),
    nameEs: text("name_es").notNull(),
    descriptionEn: text("description_en").notNull(),
    descriptionDe: text("description_de").notNull(),
    descriptionEs: text("description_es").notNull(),
    category: text("category").notNull(),
    forceType: text("force_type").notNull(),
    mechanic: text("mechanic").notNull(),
    difficulty: text("difficulty").notNull(),
    bodyPart: text("body_part").notNull(),
    equipment: text("equipment"),
    variationGroup: text("variation_group"),
    goals: text("goals")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isUnilateral: boolean("is_unilateral").notNull(),
    isBodyweight: boolean("is_bodyweight").notNull(),
    met: real("met").notNull(),
    instructions: jsonb("instructions").$type<LocalizedLists>().notNull(),
    tips: jsonb("tips").$type<LocalizedLists>().notNull(),
    images: jsonb("images").$type<ExerciseImages>().notNull(),
  },
  (table) => [
    index("exercises_category_idx").on(table.category),
    index("exercises_force_type_idx").on(table.forceType),
    index("exercises_mechanic_idx").on(table.mechanic),
    index("exercises_body_part_idx").on(table.bodyPart),
  ],
);

export const muscles = pgTable("muscles", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  imagePath: text("image_path"),
});

export const exerciseMuscles = pgTable(
  "exercise_muscles",
  {
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    muscleId: text("muscle_id")
      .notNull()
      .references(() => muscles.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
  },
  (table) => [
    primaryKey({
      name: "exercise_muscles_pk",
      columns: [table.exerciseId, table.muscleId],
    }),
    check(
      "exercise_muscles_role_check",
      sql`${table.role} in ('primary', 'secondary')`,
    ),
    index("exercise_muscles_muscle_role_idx").on(
      table.muscleId,
      table.role,
      table.exerciseId,
    ),
  ],
);
