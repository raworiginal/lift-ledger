import { db } from "@nuxthub/db";
import {
  updateSetRequestSchema,
  workoutIdSchema,
} from "../../../../../shared/validation/workouts";
import {
  authorizeWorkoutRequest,
  parseRequest,
  parseWorkoutId,
  readRequestBody,
  withWorkoutErrors,
} from "../../../../utils/workout-http";
import { updateSet } from "../../../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const workoutId = parseWorkoutId(getRouterParam(event, "id"));
  const setId = parseRequest(workoutIdSchema, getRouterParam(event, "setId"));
  const body = await readRequestBody(event, updateSetRequestSchema);
  return withWorkoutErrors(() => updateSet(db, userId, workoutId, setId, body));
});
