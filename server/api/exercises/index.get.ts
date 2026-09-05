import { asc, eq } from "drizzle-orm";
import { db, schema } from "hub:db";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  return db
    .select({
      id: schema.exercises.id,
      name: schema.exercises.name,
      equipment: schema.exercises.equipment,
      movementPatterns: schema.exercises.movementPattern,
    })
    .from(schema.exercises)
    .where(eq(schema.exercises.isActive, true))
    .orderBy(asc(schema.exercises.name));
});
