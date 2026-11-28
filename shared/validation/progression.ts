import { z } from "zod";
import { unitSchema, weightInputSchema } from "./workouts";

const repCountSchema = z
  .number()
  .int("Reps must be a whole number")
  .min(1, "Reps must be between 1 and 100")
  .max(100, "Reps must be between 1 and 100");

const weightStepSchema = weightInputSchema.refine(
  (value) => Number(value) >= 0.01 && Number(value) <= 100,
  "Weight step must be between 0.01 and 100",
);

const restTimeSecondsSchema = z
  .number()
  .int("Rest time must be a whole number of seconds")
  .min(0, "Rest time cannot be negative")
  .max(3600, "Rest time cannot exceed 60 minutes");

export const trainingPreferencesSchema = z
  .object({
    repMin: repCountSchema,
    repMax: repCountSchema,
    unit: unitSchema,
    weightStep: weightStepSchema,
    restTimeSeconds: restTimeSecondsSchema,
  })
  .refine((value) => value.repMin < value.repMax, {
    path: ["repMax"],
    message: "Rep max must be greater than rep min",
  });
