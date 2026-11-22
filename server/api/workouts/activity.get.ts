import { db } from "@nuxthub/db";
import { heatmapWindow } from "../../../shared/activity/heatmap";
import { activityQuerySchema } from "../../../shared/validation/workouts";
import {
  authorizeWorkoutRequest,
  parseRequest,
  withWorkoutErrors,
} from "../../utils/workout-http";
import { listActiveDays } from "../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const query = parseRequest(activityQuerySchema, getQuery(event));
  return withWorkoutErrors(() =>
    listActiveDays(db, userId, heatmapWindow(query.today)),
  );
});
