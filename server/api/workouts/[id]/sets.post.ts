import { db } from "@nuxthub/db";
import { saveSetRequestSchema } from "../../../../shared/validation/workouts";
import {
  authorizeWorkoutRequest,
  parseWorkoutId,
  readRequestBody,
  withWorkoutErrors,
} from "../../../utils/workout-http";
import { saveSet } from "../../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const workoutId = parseWorkoutId(getRouterParam(event, "id"));
  const body = await readRequestBody(event, saveSetRequestSchema);
  const { set, created } = await withWorkoutErrors(() =>
    saveSet(db, userId, workoutId, body),
  );
  setResponseStatus(event, created ? 201 : 200);
  return set;
});
