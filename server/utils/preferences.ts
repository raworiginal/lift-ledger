import { eq } from "drizzle-orm";
import type { db as hubDb } from "@nuxthub/db";
import { DEFAULT_TRAINING_PREFERENCES } from "../../shared/progression/preferences";
import type { TrainingPreferences } from "../../shared/types/workouts";
import { trainingPreferences } from "../db/schema/training-preferences";

export type PreferencesDb = typeof hubDb;

export async function getTrainingPreferences(
  db: PreferencesDb,
  userId: string,
): Promise<TrainingPreferences> {
  const [row] = await db
    .select({
      repMin: trainingPreferences.repMin,
      repMax: trainingPreferences.repMax,
      unit: trainingPreferences.unit,
      weightStep: trainingPreferences.weightStep,
    })
    .from(trainingPreferences)
    .where(eq(trainingPreferences.userId, userId))
    .limit(1);

  return row ?? { ...DEFAULT_TRAINING_PREFERENCES };
}

export async function saveTrainingPreferences(
  db: PreferencesDb,
  userId: string,
  input: TrainingPreferences,
): Promise<TrainingPreferences> {
  const values = {
    repMin: input.repMin,
    repMax: input.repMax,
    unit: input.unit,
    weightStep: input.weightStep,
  };
  const [row] = await db
    .insert(trainingPreferences)
    .values({ userId, ...values, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: trainingPreferences.userId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning({
      repMin: trainingPreferences.repMin,
      repMax: trainingPreferences.repMax,
      unit: trainingPreferences.unit,
      weightStep: trainingPreferences.weightStep,
    });

  if (!row) throw new Error("Training preferences were not saved.");
  return row;
}
