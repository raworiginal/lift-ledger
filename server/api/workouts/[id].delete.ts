import { db } from "@nuxthub/db";
import {
  authorizeWorkoutRequest,
  parseWorkoutId,
  readExpectedStatus,
  withWorkoutErrors,
} from "../../utils/workout-http";
import { deleteWorkout } from "../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const workoutId = parseWorkoutId(getRouterParam(event, "id"));
  const expectedStatus = readExpectedStatus(event);
  await withWorkoutErrors(() =>
    deleteWorkout(db, userId, workoutId, expectedStatus),
  );
  setResponseStatus(event, 204);
  return "";
});
