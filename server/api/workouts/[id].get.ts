import { db } from "@nuxthub/db";
import {
  authorizeWorkoutRequest,
  parseWorkoutId,
  withWorkoutErrors,
} from "../../utils/workout-http";
import { getWorkoutDetail } from "../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const workoutId = parseWorkoutId(getRouterParam(event, "id"));
  const detail = await withWorkoutErrors(() =>
    getWorkoutDetail(db, userId, workoutId),
  );
  if (!detail) {
    throw createError({ statusCode: 404, statusMessage: "Workout not found." });
  }
  return detail;
});
