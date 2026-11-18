import {
  and,
  asc,
  count,
  eq,
  exists,
  ilike,
  inArray,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@nuxthub/db";
import { exerciseMuscles, exercises, muscles } from "../../db/schema/exercises";
import {
  exerciseBodyPartValues,
  exerciseListQuerySchema,
} from "../../utils/exercises";

export default defineEventHandler(async (event) => {
  setResponseHeader(event as never, "cache-control", "private, no-store");
  await requireUserSession(event);

  const parsedQuery = exerciseListQuerySchema.safeParse(getQuery(event));
  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid exercise filters.",
    });
  }

  const filters = parsedQuery.data;
  const conditions: SQL[] = [];

  if (filters.search) {
    const escapedSearch = filters.search.replace(/[\\%_]/g, "\\$&");
    const searchPattern = `%${escapedSearch}%`;
    const searchCondition = or(
      ilike(exercises.nameEn, searchPattern),
      ilike(exercises.descriptionEn, searchPattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  if (filters.bodyPart) {
    conditions.push(
      inArray(exercises.bodyPart, exerciseBodyPartValues(filters.bodyPart)),
    );
  }

  if (filters.equipment) {
    conditions.push(eq(exercises.equipment, filters.equipment));
  }

  if (filters.category) {
    conditions.push(eq(exercises.category, filters.category));
  }
  if (filters.forceType) {
    conditions.push(eq(exercises.forceType, filters.forceType));
  }
  if (filters.mechanic) {
    conditions.push(eq(exercises.mechanic, filters.mechanic));
  }
  if (filters.muscle) {
    const muscleConditions: SQL[] = [
      eq(exerciseMuscles.exerciseId, exercises.id),
      eq(exerciseMuscles.muscleId, filters.muscle),
    ];
    if (filters.muscleRole !== "any") {
      muscleConditions.push(eq(exerciseMuscles.role, filters.muscleRole));
    }

    conditions.push(
      exists(
        db
          .select({ exerciseId: exerciseMuscles.exerciseId })
          .from(exerciseMuscles)
          .where(and(...muscleConditions)),
      ),
    );
  }

  const where = and(...conditions);
  const [items, totals] = await Promise.all([
    db
      .select({
        id: exercises.id,
        nameEn: exercises.nameEn,
        descriptionEn: exercises.descriptionEn,
        category: exercises.category,
        forceType: exercises.forceType,
        mechanic: exercises.mechanic,
        difficulty: exercises.difficulty,
        equipment: exercises.equipment,
        images: exercises.images,
      })
      .from(exercises)
      .where(where)
      .orderBy(asc(exercises.nameEn))
      .limit(filters.limit)
      .offset(filters.offset),
    db.select({ total: count() }).from(exercises).where(where),
  ]);

  const muscleRows =
    items.length > 0
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
          .where(
            inArray(
              exerciseMuscles.exerciseId,
              items.map((exercise) => exercise.id),
            ),
          )
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
    const { exerciseId: _exerciseId, role, ...muscleDetails } = muscle;
    if (role === "primary") grouped.primary.push(muscleDetails);
    else grouped.secondary.push(muscleDetails);
    musclesByExercise.set(muscle.exerciseId, grouped);
  }

  return {
    items: items.map((exercise) => ({
      ...exercise,
      primaryMuscles: musclesByExercise.get(exercise.id)?.primary ?? [],
      secondaryMuscles: musclesByExercise.get(exercise.id)?.secondary ?? [],
    })),
    total: totals[0]?.total ?? 0,
    limit: filters.limit,
    offset: filters.offset,
  };
});
