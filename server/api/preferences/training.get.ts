import { db } from "@nuxthub/db";
import { authorizeWorkoutRequest } from "../../utils/workout-http";
import { getTrainingPreferences } from "../../utils/preferences";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  return getTrainingPreferences(db, userId);
});
