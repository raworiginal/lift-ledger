import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  exerciseBodyPartValues,
  exerciseDatasetSchema,
  exerciseListQuerySchema,
  publicExerciseImagePath,
  rankSimilarExercises,
} from "../server/utils/exercises";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const dataset = exerciseDatasetSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("../data/seed/exercises.json", import.meta.url),
      "utf8",
    ),
  ) as unknown,
);

test("exercise seed data has the declared number of unique exercises", () => {
  assert.equal(dataset.count, 708);
  assert.equal(dataset.exercises.length, dataset.count);
  assert.equal(
    new Set(dataset.exercises.map((exercise) => exercise.id)).size,
    708,
  );
});

test("all exercise image references map to files in public/images/exercises", () => {
  const paths = new Set(
    dataset.exercises.flatMap((exercise) =>
      Object.values(exercise.images).flatMap((variants) =>
        Object.values(variants).map(publicExerciseImagePath),
      ),
    ),
  );

  assert.equal(paths.size, 1231);
  for (const path of paths) {
    assert.equal(
      existsSync(join(projectRoot, "public", path.slice(1))),
      true,
      `Missing mapped image ${path}`,
    );
  }
});

test("exercise filters default pagination and accept combined filter values", () => {
  assert.deepEqual(exerciseListQuerySchema.parse({}), {
    muscleRole: "any",
    limit: 24,
    offset: 0,
  });
  assert.deepEqual(
    exerciseListQuerySchema.parse({
      search: "  bench press  ",
      bodyPart: "arms",
      equipment: "barbell",
      muscle: "pectoralis_major",
      muscleRole: "primary",
      forceType: "push",
      category: "strength",
      mechanic: "compound",
      limit: "12",
      offset: "24",
    }),
    {
      search: "bench press",
      bodyPart: "arms",
      equipment: "barbell",
      muscle: "pectoralis_major",
      muscleRole: "primary",
      forceType: "push",
      category: "strength",
      mechanic: "compound",
      limit: 12,
      offset: 24,
    },
  );
});

test("exercise filters reject invalid values and unbounded pagination", () => {
  assert.equal(
    exerciseListQuerySchema.safeParse({ muscle: "Pectoralis Major" }).success,
    false,
  );
  assert.equal(
    exerciseListQuerySchema.safeParse({ category: "something-else" }).success,
    false,
  );
  assert.equal(
    exerciseListQuerySchema.safeParse({ bodyPart: "legs" }).success,
    false,
  );
  assert.equal(
    exerciseListQuerySchema.safeParse({ equipment: "Olympic bar" }).success,
    false,
  );
  assert.equal(
    exerciseListQuerySchema.safeParse({ limit: "500" }).success,
    false,
  );
  assert.equal(
    exerciseListQuerySchema.safeParse({ search: "x".repeat(101) }).success,
    false,
  );
});

test("arms body-part filter matches upper and lower arms", () => {
  assert.deepEqual(exerciseBodyPartValues("arms"), [
    "upper_arms",
    "lower_arms",
  ]);
  assert.deepEqual(exerciseBodyPartValues("chest"), ["chest"]);
});

test("similar exercise ranking favors shared primary muscles and same variation", () => {
  const source = {
    id: "bench-press",
    nameEn: "Barbell Bench Press",
    mechanic: "compound",
    variationGroup: "bench-press",
    primaryMuscles: ["pectoralis_major"],
    secondaryMuscles: ["anterior_deltoid", "triceps_brachii"],
  };
  const ranked = rankSimilarExercises(
    source,
    [
      {
        id: "dumbbell-bench-press",
        nameEn: "Dumbbell Bench Press",
        mechanic: "compound",
        variationGroup: "bench-press",
        primaryMuscles: ["pectoralis_major"],
        secondaryMuscles: ["triceps_brachii"],
      },
      {
        id: "shoulder-press",
        nameEn: "Shoulder Press",
        mechanic: "compound",
        variationGroup: null,
        primaryMuscles: ["anterior_deltoid"],
        secondaryMuscles: ["triceps_brachii"],
      },
      {
        id: "chest-fly",
        nameEn: "Chest Fly",
        mechanic: "isolation",
        variationGroup: "bench-press",
        primaryMuscles: ["pectoralis_major"],
        secondaryMuscles: [],
      },
      {
        id: "bench-press",
        nameEn: "Barbell Bench Press",
        mechanic: "compound",
        variationGroup: "bench-press",
        primaryMuscles: ["pectoralis_major"],
        secondaryMuscles: ["anterior_deltoid", "triceps_brachii"],
      },
      {
        id: "unrelated-compound",
        nameEn: "Unrelated Compound",
        mechanic: "compound",
        variationGroup: "bench-press",
        primaryMuscles: ["quadriceps"],
        secondaryMuscles: [],
      },
    ],
    10,
  );

  assert.deepEqual(
    ranked.map((exercise) => exercise.id),
    ["dumbbell-bench-press", "shoulder-press"],
  );
  assert.equal(ranked[0]?.similarity.sameVariationGroup, true);
  assert.deepEqual(ranked[0]?.similarity.sharedPrimaryMuscles, [
    "pectoralis_major",
  ]);
});

test("exercise image paths reject paths outside the source image directory", () => {
  assert.equal(
    publicExerciseImagePath("images/flat/air-bike-main.webp"),
    "/images/exercises/air-bike-main.webp",
  );
  assert.throws(() => publicExerciseImagePath("../private/image.webp"));
});
