import { db } from "@nuxthub/db";
import {
  authorizeWorkoutRequest,
  parseWorkoutId,
  withWorkoutErrors,
} from "../../../utils/workout-http";
import { completeWorkout } from "../../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const workoutId = parseWorkoutId(getRouterParam(event, "id"));
  return withWorkoutErrors(() => completeWorkout(db, userId, workoutId));
});
