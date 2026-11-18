import { asc, isNotNull } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { exercises, muscles } from "../../db/schema/exercises";
import { exerciseBodyPartFilters } from "../../utils/exercises";

export default defineEventHandler(async (event) => {
  setResponseHeader(event as never, "cache-control", "private, no-store");
  await requireUserSession(event);

  const [equipmentRows, muscleOptions] = await Promise.all([
    db
      .selectDistinct({ equipment: exercises.equipment })
      .from(exercises)
      .where(isNotNull(exercises.equipment))
      .orderBy(asc(exercises.equipment)),
    db
      .select({
        id: muscles.id,
        nameEn: muscles.nameEn,
        imagePath: muscles.imagePath,
      })
      .from(muscles)
      .orderBy(asc(muscles.nameEn)),
  ]);

  return {
    bodyParts: exerciseBodyPartFilters,
    categories: ["cardio", "olympic", "plyometrics", "strength", "stretching"],
    equipment: equipmentRows
      .map(({ equipment }) => equipment)
      .filter((equipment): equipment is string => equipment !== null),
    forceTypes: ["dynamic", "pull", "push", "static"],
    mechanics: ["compound", "isolation"],
    muscles: muscleOptions,
  };
});
