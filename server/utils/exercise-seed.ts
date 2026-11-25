import { createHash } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type postgres from "postgres";
import { appMeta } from "../db/schema/app-meta";
import { exerciseMuscles, exercises, muscles } from "../db/schema/exercises";
import {
  exerciseDatasetSchema,
  localizedListsFromExercise,
  muscleDisplayName,
  publicExerciseImagePath,
  type ExerciseDataset,
} from "./exercises";

const SEED_HASH_KEY = "exercise_seed_sha256";

export type SeedResult = {
  status: "seeded" | "unchanged";
  exercises: number;
  muscles: number;
  links: number;
};

function excluded(columnName: string) {
  return sql.raw(`excluded."${columnName}"`);
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export function parseExerciseSeed(raw: string): ExerciseDataset {
  return exerciseDatasetSchema.parse(JSON.parse(raw) as unknown);
}

export function exerciseImagePaths(dataset: ExerciseDataset): string[] {
  return dataset.exercises.flatMap((exercise) =>
    Object.values(exercise.images).flatMap((variants) =>
      Object.values(variants).map((sourcePath) =>
        publicExerciseImagePath(sourcePath),
      ),
    ),
  );
}

function exerciseRows(dataset: ExerciseDataset) {
  return dataset.exercises.map((exercise) => ({
    id: exercise.id,
    nameEn: exercise.name_en,
    nameDe: exercise.name_de,
    nameEs: exercise.name_es,
    descriptionEn: exercise.description_en,
    descriptionDe: exercise.description_de,
    descriptionEs: exercise.description_es,
    category: exercise.category,
    forceType: exercise.force_type,
    mechanic: exercise.mechanic,
    difficulty: exercise.difficulty,
    bodyPart: exercise.body_part,
    equipment: exercise.equipment ?? null,
    variationGroup: exercise.variation_group ?? null,
    goals: exercise.goals ?? [],
    tags: exercise.tags ?? [],
    isUnilateral: exercise.is_unilateral,
    isBodyweight: exercise.is_bodyweight,
    met: exercise.met,
    instructions: localizedListsFromExercise(exercise, "instructions"),
    tips: localizedListsFromExercise(exercise, "tips"),
    images: Object.fromEntries(
      Object.entries(exercise.images).map(([style, variants]) => [
        style,
        Object.fromEntries(
          Object.entries(variants).map(([phase, sourcePath]) => [
            phase,
            publicExerciseImagePath(sourcePath),
          ]),
        ),
      ]),
    ),
  }));
}

function muscleRows(
  dataset: ExerciseDataset,
  muscleImageFiles: ReadonlySet<string>,
) {
  const slugs = new Set(
    dataset.exercises.flatMap((exercise) => [
      ...(exercise.primary_muscles ?? []),
      ...(exercise.secondary_muscles ?? []),
    ]),
  );

  return [...slugs].sort().map((id) => {
    const imageFile = `${id.replaceAll("_", "-")}.webp`;

    return {
      id,
      nameEn: muscleDisplayName(id),
      imagePath: muscleImageFiles.has(imageFile)
        ? `/images/muscles/${imageFile}`
        : null,
    };
  });
}

function exerciseMuscleRows(dataset: ExerciseDataset) {
  return dataset.exercises.flatMap((exercise) => [
    ...(exercise.primary_muscles ?? []).map((muscleId) => ({
      exerciseId: exercise.id,
      muscleId,
      role: "primary",
    })),
    ...(exercise.secondary_muscles ?? []).map((muscleId) => ({
      exerciseId: exercise.id,
      muscleId,
      role: "secondary",
    })),
  ]);
}

export async function seedExerciseCatalog(
  client: postgres.Sql,
  raw: string,
  options: { muscleImageFiles: ReadonlySet<string>; force?: boolean },
): Promise<SeedResult> {
  const dataset = parseExerciseSeed(raw);
  const hash = createHash("sha256")
    .update(JSON.stringify(JSON.parse(raw) as unknown))
    .digest("hex");
  const exercisesToImport = exerciseRows(dataset);
  const musclesToImport = muscleRows(dataset, options.muscleImageFiles);
  const exerciseMusclesToImport = exerciseMuscleRows(dataset);
  const counts = {
    exercises: exercisesToImport.length,
    muscles: musclesToImport.length,
    links: exerciseMusclesToImport.length,
  };

  const db = drizzle(client);

  if (!options.force) {
    const [current] = await db
      .select({ value: appMeta.value })
      .from(appMeta)
      .where(eq(appMeta.key, SEED_HASH_KEY))
      .limit(1);
    if (current?.value === hash) return { status: "unchanged", ...counts };
  }

  await db.transaction(async (tx) => {
    for (const batch of chunks(musclesToImport, 100)) {
      await tx
        .insert(muscles)
        .values(batch)
        .onConflictDoUpdate({
          target: muscles.id,
          set: {
            nameEn: excluded("name_en"),
            imagePath: excluded("image_path"),
          },
        });
    }

    for (const batch of chunks(exercisesToImport, 100)) {
      await tx
        .insert(exercises)
        .values(batch)
        .onConflictDoUpdate({
          target: exercises.id,
          set: {
            nameEn: excluded("name_en"),
            nameDe: excluded("name_de"),
            nameEs: excluded("name_es"),
            descriptionEn: excluded("description_en"),
            descriptionDe: excluded("description_de"),
            descriptionEs: excluded("description_es"),
            category: excluded("category"),
            forceType: excluded("force_type"),
            mechanic: excluded("mechanic"),
            difficulty: excluded("difficulty"),
            bodyPart: excluded("body_part"),
            equipment: excluded("equipment"),
            variationGroup: excluded("variation_group"),
            goals: excluded("goals"),
            tags: excluded("tags"),
            isUnilateral: excluded("is_unilateral"),
            isBodyweight: excluded("is_bodyweight"),
            met: excluded("met"),
            instructions: excluded("instructions"),
            tips: excluded("tips"),
            images: excluded("images"),
          },
        });
    }

    await tx.delete(exerciseMuscles).where(
      inArray(
        exerciseMuscles.exerciseId,
        dataset.exercises.map((exercise) => exercise.id),
      ),
    );

    for (const batch of chunks(exerciseMusclesToImport, 250)) {
      await tx.insert(exerciseMuscles).values(batch);
    }

    await tx
      .insert(appMeta)
      .values({ key: SEED_HASH_KEY, value: hash })
      .onConflictDoUpdate({
        target: appMeta.key,
        set: { value: hash, updatedAt: sql`now()` },
      });
  });

  return { status: "seeded", ...counts };
}
