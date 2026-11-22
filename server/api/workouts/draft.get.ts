import { db } from "@nuxthub/db";
import {
  authorizeWorkoutRequest,
  withWorkoutErrors,
} from "../../utils/workout-http";
import { getDraft } from "../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  return withWorkoutErrors(() => getDraft(db, userId));
});
