import type { H3Event } from "h3";
import type { z } from "zod";
import {
  expectedStatusQuerySchema,
  workoutIdSchema,
} from "../../shared/validation/workouts";
import type { WorkoutStatus } from "../../shared/types/workouts";
import { WorkoutError } from "./workouts";

export async function authorizeWorkoutRequest(event: H3Event): Promise<string> {
  setResponseHeader(event as never, "cache-control", "private, no-store");
  const session = await requireUserSession(event);
  return session.user.id;
}

export async function withWorkoutErrors<T>(
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof WorkoutError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
      });
    }
    throw error;
  }
}

export function parseWorkoutId(value: string | undefined): string {
  const result = workoutIdSchema.safeParse(value);
  if (!result.success) {
    throw createError({ statusCode: 404, statusMessage: "Workout not found." });
  }
  return result.data;
}

export function parseRequest<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result.error.issues[0]?.message ?? "Invalid request.",
    });
  }
  return result.data;
}

export async function readRequestBody<T extends z.ZodType>(
  event: H3Event,
  schema: T,
): Promise<z.output<T>> {
  return parseRequest(schema, await readBody(event));
}

export function readExpectedStatus(event: H3Event): WorkoutStatus {
  return parseRequest(expectedStatusQuerySchema, getQuery(event))
    .expectedStatus;
}
