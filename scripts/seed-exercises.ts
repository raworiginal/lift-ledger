import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  exerciseMuscles,
  exercises,
  muscles,
} from "../server/db/schema/exercises";
import {
  exerciseDatasetSchema,
  localizedListsFromExercise,
  muscleDisplayName,
  publicExerciseImagePath,
} from "../server/utils/exercises";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const seedPath = join(projectRoot, "data/seed/exercises.json");
const publicRoot = join(projectRoot, "public");

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

function loadDataset() {
  const raw = JSON.parse(readFileSync(seedPath, "utf8")) as unknown;
  return exerciseDatasetSchema.parse(raw);
}

function verifyExerciseAssets(dataset: ReturnType<typeof loadDataset>) {
  for (const exercise of dataset.exercises) {
    for (const variants of Object.values(exercise.images)) {
      for (const sourcePath of Object.values(variants)) {
        const publicPath = publicExerciseImagePath(sourcePath);
        const diskPath = join(publicRoot, publicPath.slice(1));
        if (!existsSync(diskPath)) {
          throw new Error(
            `Missing exercise image for "${exercise.id}": ${diskPath}`,
          );
        }
      }
    }
  }
}

function exerciseRows(dataset: ReturnType<typeof loadDataset>) {
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

function muscleRows(dataset: ReturnType<typeof loadDataset>) {
  const slugs = new Set(
    dataset.exercises.flatMap((exercise) => [
      ...(exercise.primary_muscles ?? []),
      ...(exercise.secondary_muscles ?? []),
    ]),
  );

  return [...slugs].sort().map((id) => {
    const imageFile = `${id.replaceAll("_", "-")}.webp`;
    const diskPath = join(publicRoot, "images", "muscles", imageFile);

    return {
      id,
      nameEn: muscleDisplayName(id),
      imagePath: existsSync(diskPath) ? `/images/muscles/${imageFile}` : null,
    };
  });
}

function exerciseMuscleRows(dataset: ReturnType<typeof loadDataset>) {
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

async function main() {
  const dataset = loadDataset();
  verifyExerciseAssets(dataset);

  const databaseUrl =
    process.env.MIGRATIONS_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "Set DATABASE_URL or MIGRATIONS_DATABASE_URL before seeding exercises.",
    );
  }

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle({
    client,
    schema: { exercises, muscles, exerciseMuscles },
  });

  const exercisesToImport = exerciseRows(dataset);
  const musclesToImport = muscleRows(dataset);
  const exerciseMusclesToImport = exerciseMuscleRows(dataset);

  try {
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
    });
  } finally {
    await client.end();
  }

  console.info(
    `Seeded ${exercisesToImport.length} exercises, ${musclesToImport.length} muscles, and ${exerciseMusclesToImport.length} exercise-muscle links.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
