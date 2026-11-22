import { db } from "@nuxthub/db";
import { updateWorkoutRequestSchema } from "../../../shared/validation/workouts";
import {
  authorizeWorkoutRequest,
  parseWorkoutId,
  readRequestBody,
  withWorkoutErrors,
} from "../../utils/workout-http";
import { updateWorkout } from "../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const workoutId = parseWorkoutId(getRouterParam(event, "id"));
  const body = await readRequestBody(event, updateWorkoutRequestSchema);
  return withWorkoutErrors(() =>
    updateWorkout(db, userId, workoutId, {
      date: body.date,
      focus: body.focus,
      unit: body.unit,
      expectedStatus: body.expectedStatus,
    }),
  );
});
