import { db } from "@nuxthub/db";
import { progressionWindow } from "../../../shared/progression/progression";
import { activityQuerySchema } from "../../../shared/validation/workouts";
import { getTrainingPreferences } from "../../utils/preferences";
import { buildProgressionItems } from "../../utils/progression";
import {
  authorizeWorkoutRequest,
  parseRequest,
  withWorkoutErrors,
} from "../../utils/workout-http";
import { listRecentExerciseSessions } from "../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const query = parseRequest(activityQuerySchema, getQuery(event));
  const window = progressionWindow(query.today);
  return withWorkoutErrors(async () => {
    const preferences = await getTrainingPreferences(db, userId);
    const rows = await listRecentExerciseSessions(db, userId, window);
    return {
      preferences,
      items: buildProgressionItems(rows, preferences, window),
    };
  });
});
