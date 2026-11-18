import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@nuxthub/db";
import {
  exerciseMuscles,
  exercises,
  muscles,
} from "../../../db/schema/exercises";
import {
  exerciseAlternativesQuerySchema,
  rankSimilarExercises,
} from "../../../utils/exercises";

export default defineEventHandler(async (event) => {
  setResponseHeader(event as never, "cache-control", "private, no-store");
  await requireUserSession(event);

  const exerciseId = getRouterParam(event, "id");
  if (!exerciseId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(exerciseId)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Exercise not found.",
    });
  }

  const parsedQuery = exerciseAlternativesQuerySchema.safeParse(
    getQuery(event),
  );
  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid alternatives limit.",
    });
  }

  const [source] = await db
    .select({
      id: exercises.id,
      nameEn: exercises.nameEn,
      mechanic: exercises.mechanic,
      variationGroup: exercises.variationGroup,
    })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);

  if (!source) {
    throw createError({
      statusCode: 404,
      statusMessage: "Exercise not found.",
    });
  }

  const candidates = await db
    .select({
      id: exercises.id,
      nameEn: exercises.nameEn,
      descriptionEn: exercises.descriptionEn,
      category: exercises.category,
      forceType: exercises.forceType,
      mechanic: exercises.mechanic,
      difficulty: exercises.difficulty,
      equipment: exercises.equipment,
      variationGroup: exercises.variationGroup,
      images: exercises.images,
    })
    .from(exercises)
    .where(eq(exercises.mechanic, source.mechanic))
    .orderBy(asc(exercises.nameEn));
  const candidateIds = candidates.map((candidate) => candidate.id);
  const muscleRows =
    candidateIds.length > 0
      ? await db
          .select({
            exerciseId: exerciseMuscles.exerciseId,
            role: exerciseMuscles.role,
            id: muscles.id,
            nameEn: muscles.nameEn,
            imagePath: muscles.imagePath,
          })
          .from(exerciseMuscles)
          .innerJoin(muscles, eq(exerciseMuscles.muscleId, muscles.id))
          .where(inArray(exerciseMuscles.exerciseId, candidateIds))
          .orderBy(asc(muscles.nameEn))
      : [];

  const musclesByExercise = new Map<
    string,
    {
      primary: Array<{ id: string; nameEn: string; imagePath: string | null }>;
      secondary: Array<{
        id: string;
        nameEn: string;
        imagePath: string | null;
      }>;
    }
  >();

  for (const muscle of muscleRows) {
    const grouped = musclesByExercise.get(muscle.exerciseId) ?? {
      primary: [],
      secondary: [],
    };
    const { exerciseId: candidateId, role, ...muscleDetails } = muscle;
    if (role === "primary") grouped.primary.push(muscleDetails);
    else grouped.secondary.push(muscleDetails);
    musclesByExercise.set(candidateId, grouped);
  }

  const sourceMuscles = musclesByExercise.get(source.id) ?? {
    primary: [],
    secondary: [],
  };
  const sourceForRanking = {
    id: source.id,
    nameEn: source.nameEn,
    mechanic: source.mechanic,
    variationGroup: source.variationGroup,
    primaryMuscles: sourceMuscles.primary.map((muscle) => muscle.id),
    secondaryMuscles: sourceMuscles.secondary.map((muscle) => muscle.id),
  };
  const ranked = rankSimilarExercises(
    sourceForRanking,
    candidates.map((candidate) => {
      const candidateMuscles = musclesByExercise.get(candidate.id) ?? {
        primary: [],
        secondary: [],
      };
      return {
        ...candidate,
        primaryMuscles: candidateMuscles.primary.map((muscle) => muscle.id),
        secondaryMuscles: candidateMuscles.secondary.map((muscle) => muscle.id),
      };
    }),
    parsedQuery.data.limit,
  );

  return {
    exerciseId: source.id,
    alternatives: ranked.map(({ similarity, ...exercise }) => ({
      ...exercise,
      primaryMuscles: musclesByExercise.get(exercise.id)?.primary ?? [],
      secondaryMuscles: musclesByExercise.get(exercise.id)?.secondary ?? [],
      similarity,
    })),
  };
});
