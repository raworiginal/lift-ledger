import {
  buildExerciseProgression,
  type ExerciseSession,
} from "../../shared/progression/progression";
import type {
  ExerciseProgression,
  TrainingPreferences,
} from "../../shared/types/workouts";
import type { RecentExerciseSessionRow } from "./workouts";

const MAX_ITEMS = 8;

export function buildProgressionItems(
  rows: RecentExerciseSessionRow[],
  preferences: TrainingPreferences,
  window: { start: string; end: string },
): ExerciseProgression[] {
  return [...groupSessionsByExercise(rows).values()]
    .filter((sessions) => newestSession(sessions).date >= window.start)
    .sort((a, b) => compareSessions(newestSession(b), newestSession(a)))
    .slice(0, MAX_ITEMS)
    .map((sessions) => buildExerciseProgression(sessions, preferences, window));
}

export function groupSessionsByExercise(
  rows: RecentExerciseSessionRow[],
): Map<string, ExerciseSession[]> {
  const sessions = new Map<string, ExerciseSession>();

  for (const row of rows) {
    const key = JSON.stringify([row.exerciseId, row.workoutId]);
    let session = sessions.get(key);
    if (!session) {
      session = {
        exerciseId: row.exerciseId,
        name: row.name,
        date: row.workoutDate,
        completedAt: row.completedAt.toISOString(),
        unit: row.unit,
        sets: [],
      };
      sessions.set(key, session);
    }
    session.sets.push({ weight: row.weight, reps: row.reps });
  }

  const byExercise = new Map<string, ExerciseSession[]>();
  for (const session of sessions.values()) {
    const list = byExercise.get(session.exerciseId) ?? [];
    list.push(session);
    byExercise.set(session.exerciseId, list);
  }
  return byExercise;
}

function newestSession(sessions: ExerciseSession[]): ExerciseSession {
  const [newest] = [...sessions].sort((a, b) => compareSessions(b, a));
  if (!newest) throw new Error("Progression needs at least one session");
  return newest;
}

function compareSessions(a: ExerciseSession, b: ExerciseSession): number {
  return (
    a.date.localeCompare(b.date) || a.completedAt.localeCompare(b.completedAt)
  );
}
