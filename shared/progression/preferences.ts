import type { TrainingPreferences } from "../types/workouts";

export const DEFAULT_TRAINING_PREFERENCES: TrainingPreferences = {
  repMin: 8,
  repMax: 12,
  unit: "lb",
  weightStep: "5",
  restTimeSeconds: 120,
};
