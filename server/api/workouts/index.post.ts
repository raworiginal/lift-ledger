import { db } from "@nuxthub/db";
import { startWorkoutRequestSchema } from "../../../shared/validation/workouts";
import {
  authorizeWorkoutRequest,
  readRequestBody,
  withWorkoutErrors,
} from "../../utils/workout-http";
import { startDraft } from "../../utils/workouts";

export default defineEventHandler(async (event) => {
  const userId = await authorizeWorkoutRequest(event);
  const body = await readRequestBody(event, startWorkoutRequestSchema);
  const { workout, created } = await withWorkoutErrors(() =>
    startDraft(db, userId, {
      date: body.date,
      focus: body.focus,
      unit: body.unit,
    }),
  );
  setResponseStatus(event, created ? 201 : 200);
  return workout;
});
