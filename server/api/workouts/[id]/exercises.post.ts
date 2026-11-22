import { db } from "@nuxthub/db";
import { addExerciseRequestSchema } from "../../../../shared/validation/workouts";
import {
  authorizeWorkoutRequest,
  parseWorkoutId,
  readRequestBody,
  withWorkoutErrors,
} from "../../../utils/workout-http";
import { addExerciseToWorkout } from "../../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const workoutId = parseWorkoutId(getRouterParam(event, "id"));
  const body = await readRequestBody(event, addExerciseRequestSchema);
  const { exercise, created } = await withWorkoutErrors(() =>
    addExerciseToWorkout(db, userId, workoutId, body),
  );
  setResponseStatus(event, created ? 201 : 200);
  return exercise;
});
