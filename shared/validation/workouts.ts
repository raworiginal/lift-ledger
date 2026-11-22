import { z } from "zod";

export const WORKOUT_FOCUS_MAX_LENGTH = 50;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isRealCalendarDate(value: string) {
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const localDateSchema = z
  .string()
  .regex(isoDatePattern, "Date must be YYYY-MM-DD")
  .refine(isRealCalendarDate, "Date must be a real calendar date");

export function workoutDateSchema(today: string) {
  return localDateSchema.refine(
    (value) => value <= today,
    "Date cannot be in the future",
  );
}

export const focusSchema = z
  .string()
  .trim()
  .min(1, "Focus is required")
  .max(
    WORKOUT_FOCUS_MAX_LENGTH,
    `Focus must be ${WORKOUT_FOCUS_MAX_LENGTH} characters or fewer`,
  );

export const unitSchema = z.enum(["kg", "lb"], {
  error: "Unit must be kg or lb",
});

export const weightInputSchema = z
  .string()
  .trim()
  .min(1, "Weight is required")
  .regex(/^\d+(\.\d{1,2})?$/, "Weight must be a number with up to two decimals")
  .refine(
    (value) => Number(value) <= 9999.99,
    "Weight must be 9999.99 or less",
  );

export const repsInputSchema = z
  .string()
  .trim()
  .min(1, "Reps is required")
  .regex(/^\d+$/, "Reps must be a whole number")
  .refine(
    (value) => Number(value) >= 1 && Number(value) <= 100,
    "Reps must be between 1 and 100",
  );

export function startWorkoutSchema(today: string) {
  return z.object({
    date: workoutDateSchema(today),
    focus: focusSchema,
    unit: unitSchema,
  });
}

export const workoutSetInputSchema = z
  .object({
    weight: weightInputSchema,
    reps: repsInputSchema,
  })
  .transform(({ weight, reps }) => ({
    weight: Number(weight),
    reps: Number(reps),
  }));

export const workoutIdSchema = z.uuid();

export const expectedStatusSchema = z.enum(["draft", "completed"]);

export const exerciseIdSchema = z.string().trim().min(1).max(200);

export const expectedStatusQuerySchema = z.object({
  expectedStatus: expectedStatusSchema,
});

export const activityQuerySchema = z.object({
  today: localDateSchema,
});

export const listWorkoutsQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

function addDateIssues(
  value: { today: string; date?: string },
  context: z.RefinementCtx,
) {
  if (value.date === undefined) return;
  const result = workoutDateSchema(value.today).safeParse(value.date);
  if (result.success) return;
  for (const issue of result.error.issues) {
    context.addIssue({
      code: "custom",
      message: issue.message,
      path: ["date"],
    });
  }
}

export const startWorkoutRequestSchema = z
  .object({
    today: localDateSchema,
    date: z.string(),
    focus: focusSchema,
    unit: unitSchema,
  })
  .superRefine(addDateIssues);

export const updateWorkoutRequestSchema = z
  .object({
    today: localDateSchema,
    expectedStatus: expectedStatusSchema,
    date: z.string().optional(),
    focus: focusSchema.optional(),
    unit: unitSchema.optional(),
  })
  .superRefine(addDateIssues);

export const addExerciseRequestSchema = z.object({
  exerciseId: exerciseIdSchema,
  expectedStatus: expectedStatusSchema,
});

export const saveSetRequestSchema = z.object({
  id: z.uuid(),
  exerciseId: exerciseIdSchema,
  weight: weightInputSchema,
  reps: repsInputSchema,
  expectedStatus: expectedStatusSchema,
});

export const updateSetRequestSchema = z
  .object({
    weight: weightInputSchema.optional(),
    reps: repsInputSchema.optional(),
    expectedStatus: expectedStatusSchema,
  })
  .refine(
    (value) => value.weight !== undefined || value.reps !== undefined,
    "Provide a weight or reps to update",
  );
