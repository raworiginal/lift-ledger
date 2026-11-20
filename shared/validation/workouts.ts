import { z } from "zod";

export const WORKOUT_FOCUS_MAX_LENGTH = 50;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isRealCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function workoutDateSchema(today: string) {
  return z
    .string()
    .regex(isoDatePattern, "Date must be YYYY-MM-DD")
    .refine(isRealCalendarDate, "Date must be a real calendar date")
    .refine((value) => value <= today, "Date cannot be in the future");
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
  .refine((value) => Number(value) <= 9999.99, "Weight must be 9999.99 or less");

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
