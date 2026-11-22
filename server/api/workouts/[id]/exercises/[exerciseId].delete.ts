import { db } from "@nuxthub/db";
import { exerciseIdSchema } from "../../../../../shared/validation/workouts";
import {
  authorizeWorkoutRequest,
  parseRequest,
  parseWorkoutId,
  readExpectedStatus,
  withWorkoutErrors,
} from "../../../../utils/workout-http";
import { removeExerciseFromWorkout } from "../../../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const workoutId = parseWorkoutId(getRouterParam(event, "id"));
  const exerciseId = parseRequest(
    exerciseIdSchema,
    getRouterParam(event, "exerciseId"),
  );
  const expectedStatus = readExpectedStatus(event);
  await withWorkoutErrors(() =>
    removeExerciseFromWorkout(db, userId, workoutId, {
      exerciseId,
      expectedStatus,
    }),
  );
  setResponseStatus(event, 204);
  return "";
});
