import { db } from "@nuxthub/db";
import { workoutIdSchema } from "../../../../../shared/validation/workouts";
import {
  authorizeWorkoutRequest,
  parseRequest,
  parseWorkoutId,
  readExpectedStatus,
  withWorkoutErrors,
} from "../../../../utils/workout-http";
import { deleteSet } from "../../../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const workoutId = parseWorkoutId(getRouterParam(event, "id"));
  const setId = parseRequest(workoutIdSchema, getRouterParam(event, "setId"));
  const expectedStatus = readExpectedStatus(event);
  await withWorkoutErrors(() =>
    deleteSet(db, userId, workoutId, setId, expectedStatus),
  );
  setResponseStatus(event, 204);
  return "";
});
