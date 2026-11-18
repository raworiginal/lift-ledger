import { asc } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { muscles } from "../../db/schema/exercises";

export default defineEventHandler(async (event) => {
  setResponseHeader(event as never, "cache-control", "private, no-store");
  await requireUserSession(event);

  return {
    categories: ["cardio", "olympic", "plyometrics", "strength", "stretching"],
    forceTypes: ["dynamic", "pull", "push", "static"],
    mechanics: ["compound", "isolation"],
    muscles: await db
      .select({
        id: muscles.id,
        nameEn: muscles.nameEn,
        imagePath: muscles.imagePath,
      })
      .from(muscles)
      .orderBy(asc(muscles.nameEn)),
  };
});
