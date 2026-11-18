import { z } from "zod";

const sourceImagePathSchema = z
  .string()
  .regex(/^images\/flat\/[a-z0-9-]+\.webp$/);

const exerciseSeedSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name_en: z.string().min(1),
    name_de: z.string().min(1),
    name_es: z.string().min(1),
    description_en: z.string().min(1),
    description_de: z.string().min(1),
    description_es: z.string().min(1),
    category: z.enum([
      "cardio",
      "olympic",
      "plyometrics",
      "strength",
      "stretching",
    ]),
    force_type: z.enum(["dynamic", "pull", "push", "static"]),
    mechanic: z.enum(["compound", "isolation"]),
    difficulty: z.enum(["advanced", "beginner", "intermediate"]),
    body_part: z.enum([
      "back",
      "chest",
      "core",
      "full_body",
      "lower_arms",
      "lower_legs",
      "shoulders",
      "upper_arms",
      "upper_legs",
    ]),
    equipment: z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .optional(),
    variation_group: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    primary_muscles: z.array(z.string().regex(/^[a-z0-9_]+$/)).optional(),
    secondary_muscles: z.array(z.string().regex(/^[a-z0-9_]+$/)).optional(),
    goals: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1)).optional(),
    is_unilateral: z.boolean(),
    is_bodyweight: z.boolean(),
    met: z.number().finite().nonnegative(),
    instructions_en: z.array(z.string().min(1)),
    instructions_de: z.array(z.string().min(1)),
    instructions_es: z.array(z.string().min(1)),
    tips_en: z.array(z.string().min(1)),
    tips_de: z.array(z.string().min(1)),
    tips_es: z.array(z.string().min(1)),
    images: z.record(
      z.string().min(1),
      z.record(z.string().min(1), sourceImagePathSchema),
    ),
  })
  .strict()
  .superRefine((exercise, context) => {
    const primary = new Set(exercise.primary_muscles ?? []);
    for (const muscle of exercise.secondary_muscles ?? []) {
      if (primary.has(muscle)) {
        context.addIssue({
          code: "custom",
          message: `Muscle "${muscle}" is listed as both primary and secondary.`,
          path: ["secondary_muscles"],
        });
      }
    }
  });

export const exerciseDatasetSchema = z
  .object({
    name: z.string().min(1),
    homepage: z.string().url(),
    license: z.string().min(1),
    schema_version: z.number().int().positive(),
    count: z.number().int().nonnegative(),
    note: z.string().min(1),
    exercises: z.array(exerciseSeedSchema),
  })
  .superRefine((dataset, context) => {
    if (dataset.count !== dataset.exercises.length) {
      context.addIssue({
        code: "custom",
        message: `Declared count ${dataset.count} does not match ${dataset.exercises.length} exercises.`,
        path: ["count"],
      });
    }

    const seenIds = new Set<string>();
    for (const [index, exercise] of dataset.exercises.entries()) {
      if (seenIds.has(exercise.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate exercise ID "${exercise.id}".`,
          path: ["exercises", index, "id"],
        });
      }
      seenIds.add(exercise.id);
    }
  });

export type ExerciseSeed = z.infer<typeof exerciseSeedSchema>;
export type ExerciseDataset = z.infer<typeof exerciseDatasetSchema>;

export const exerciseBodyPartFilters = [
  "arms",
  "back",
  "chest",
  "core",
  "full_body",
  "lower_legs",
  "shoulders",
  "upper_legs",
] as const;

export type ExerciseBodyPartFilter = (typeof exerciseBodyPartFilters)[number];

export function exerciseBodyPartValues(
  bodyPart: ExerciseBodyPartFilter,
): readonly string[] {
  return bodyPart === "arms" ? ["upper_arms", "lower_arms"] : [bodyPart];
}

export const exerciseListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  bodyPart: z.enum(exerciseBodyPartFilters).optional(),
  equipment: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  muscle: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  muscleRole: z.enum(["any", "primary", "secondary"]).default("any"),
  forceType: z.enum(["dynamic", "pull", "push", "static"]).optional(),
  category: z
    .enum(["cardio", "olympic", "plyometrics", "strength", "stretching"])
    .optional(),
  mechanic: z.enum(["compound", "isolation"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export const exerciseAlternativesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export function publicExerciseImagePath(sourcePath: string): string {
  if (!sourceImagePathSchema.safeParse(sourcePath).success) {
    throw new Error(`Invalid source exercise image path: ${sourcePath}`);
  }

  return `/images/exercises/${sourcePath.slice("images/flat/".length)}`;
}

export function muscleDisplayName(slug: string): string {
  return slug
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function localizedListsFromExercise(
  exercise: ExerciseSeed,
  prefix: "instructions" | "tips",
) {
  return {
    en: exercise[`${prefix}_en`],
    de: exercise[`${prefix}_de`],
    es: exercise[`${prefix}_es`],
  };
}

export type MuscleRole = "primary" | "secondary";

export type SimilarityExercise = {
  id: string;
  nameEn: string;
  mechanic: string;
  variationGroup: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
};

export type ExerciseSimilarity = {
  score: number;
  sharedMuscles: string[];
  sharedPrimaryMuscles: string[];
  sharedSecondaryMuscles: string[];
  sameVariationGroup: boolean;
};

function intersection(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => rightSet.has(value)).sort();
}

export function scoreExerciseSimilarity(
  source: SimilarityExercise,
  candidate: SimilarityExercise,
): ExerciseSimilarity {
  const primaryMatches = intersection(
    source.primaryMuscles,
    candidate.primaryMuscles,
  );
  const secondaryMatches = intersection(
    source.secondaryMuscles,
    candidate.secondaryMuscles,
  );
  const crossRoleMatches = [
    ...intersection(source.primaryMuscles, candidate.secondaryMuscles),
    ...intersection(source.secondaryMuscles, candidate.primaryMuscles),
  ];
  const sharedMuscles = [
    ...new Set([...primaryMatches, ...secondaryMatches, ...crossRoleMatches]),
  ].sort();
  const sameVariationGroup = Boolean(
    source.variationGroup &&
      candidate.variationGroup &&
      source.variationGroup === candidate.variationGroup,
  );

  return {
    score:
      primaryMatches.length * 4 +
      crossRoleMatches.length * 2 +
      secondaryMatches.length +
      (sameVariationGroup ? 2 : 0),
    sharedMuscles,
    sharedPrimaryMuscles: primaryMatches,
    sharedSecondaryMuscles: secondaryMatches,
    sameVariationGroup,
  };
}

export function rankSimilarExercises<T extends SimilarityExercise>(
  source: SimilarityExercise,
  candidates: T[],
  limit: number,
): Array<T & { similarity: ExerciseSimilarity }> {
  return candidates
    .filter(
      (candidate) =>
        candidate.id !== source.id && candidate.mechanic === source.mechanic,
    )
    .map((candidate) => ({
      ...candidate,
      similarity: scoreExerciseSimilarity(source, candidate),
    }))
    .filter((candidate) => candidate.similarity.sharedMuscles.length > 0)
    .sort(
      (left, right) =>
        right.similarity.score - left.similarity.score ||
        left.nameEn.localeCompare(right.nameEn),
    )
    .slice(0, limit);
}
