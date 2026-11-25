import { db } from "@nuxthub/db";
import { trainingPreferencesSchema } from "../../../shared/validation/progression";
import {
  authorizeWorkoutRequest,
  readRequestBody,
} from "../../utils/workout-http";
import { saveTrainingPreferences } from "../../utils/preferences";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const body = await readRequestBody(event, trainingPreferencesSchema);
  return saveTrainingPreferences(db, userId, body);
});
