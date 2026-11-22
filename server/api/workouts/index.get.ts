import { db } from "@nuxthub/db";
import { listWorkoutsQuerySchema } from "../../../shared/validation/workouts";
import {
  authorizeWorkoutRequest,
  parseRequest,
  withWorkoutErrors,
} from "../../utils/workout-http";
import { listCompletedWorkouts } from "../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const query = parseRequest(listWorkoutsQuerySchema, getQuery(event));
  return withWorkoutErrors(() =>
    listCompletedWorkouts(db, userId, {
      cursor: query.cursor,
      limit: query.limit,
    }),
  );
});
