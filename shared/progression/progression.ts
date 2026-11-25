import { addDays } from "../activity/heatmap";
import { isAssistedExercise } from "../exercises/assisted";
import type {
  ExerciseProgression,
  ProgressionStatus,
  TrainingPreferences,
  WorkoutUnit,
} from "../types/workouts";
import { fromHundredths, toHundredths } from "./weights";

const WINDOW_DAYS = 28;
const STALL_SESSIONS = 3;

export interface ProgressionSet {
  weight: string;
  reps: number;
}

// One completed workout's sets for one exercise. Callers may pass sessions in any order.
export interface ExerciseSession {
  exerciseId: string;
  name: string;
  date: string;
  completedAt: string;
  unit: WorkoutUnit;
  sets: ProgressionSet[];
}

export interface SessionSummary {
  workingWeight: string;
  reps: number[];
  totalReps: number;
}

export function progressionWindow(today: string): {
  start: string;
  end: string;
} {
  return { start: addDays(today, -(WINDOW_DAYS - 1)), end: today };
}

export function summarizeSession(sets: ProgressionSet[]): SessionSummary {
  if (sets.length === 0) throw new Error("A session needs at least one set");

  // Assistance is stored as negative, so the highest value is the least assisted set.
  let heaviest = Number.NEGATIVE_INFINITY;
  for (const set of sets) {
    heaviest = Math.max(heaviest, toHundredths(set.weight));
  }

  const reps = sets.map((set) => set.reps);
  return {
    workingWeight: fromHundredths(heaviest),
    reps,
    totalReps: reps.reduce((total, value) => total + value, 0),
  };
}

export function progressionStatus(
  sessions: ExerciseSession[],
  preferences: TrainingPreferences,
): ProgressionStatus {
  const ordered = newestFirst(sessions);
  const latest = ordered[0];
  if (!latest) throw new Error("Progression needs at least one session");

  if (allSetsReach(latest.sets, preferences.repMax)) return "ready";
  if (latest.sets.some((set) => set.reps < preferences.repMin)) return "below";

  const sameUnit = ordered.filter((session) => session.unit === latest.unit);
  return isStalled(sameUnit) ? "stalled" : "building";
}

export function suggestedWeight(
  session: Pick<ExerciseSession, "name" | "unit" | "sets">,
  preferences: TrainingPreferences,
): string | null {
  if (session.unit !== preferences.unit) return null;
  if (!allSetsReach(session.sets, preferences.repMax)) return null;

  const { workingWeight } = summarizeSession(session.sets);
  const current = toHundredths(workingWeight);
  const next = current + toHundredths(preferences.weightStep);

  if (!isAssistedExercise(session.name)) return fromHundredths(next);
  if (current >= 0) return null;
  return fromHundredths(Math.min(next, 0));
}

export function buildExerciseProgression(
  sessions: ExerciseSession[],
  preferences: TrainingPreferences,
  window: { start: string; end: string },
): ExerciseProgression {
  const ordered = newestFirst(sessions);
  const latest = ordered[0];
  if (!latest) throw new Error("Progression needs at least one session");

  const summary = summarizeSession(latest.sets);
  const history = ordered
    .filter(
      (session) =>
        session.unit === latest.unit &&
        session.date >= window.start &&
        session.date <= window.end,
    )
    .reverse();

  return {
    exerciseId: latest.exerciseId,
    name: latest.name,
    unit: latest.unit,
    assisted: isAssistedExercise(latest.name),
    lastDate: latest.date,
    workingWeight: summary.workingWeight,
    reps: summary.reps,
    progress: Math.min(
      1,
      summary.totalReps / (latest.sets.length * preferences.repMax),
    ),
    status: progressionStatus(sessions, preferences),
    suggestedWeight: suggestedWeight(latest, preferences),
    weightHistory: history.map((session) => ({
      date: session.date,
      weight: summarizeSession(session.sets).workingWeight,
    })),
  };
}

function newestFirst(sessions: ExerciseSession[]): ExerciseSession[] {
  return [...sessions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      Date.parse(b.completedAt) - Date.parse(a.completedAt),
  );
}

function allSetsReach(sets: ProgressionSet[], reps: number): boolean {
  return sets.every((set) => set.reps >= reps);
}

// sameUnit is newest first. Stalled means the last three sessions share a
// working weight and total reps never increase from one session to the next.
function isStalled(sameUnit: ExerciseSession[]): boolean {
  const recent = sameUnit.slice(0, STALL_SESSIONS);
  if (recent.length < STALL_SESSIONS) return false;

  const summaries = recent.map((session) => summarizeSession(session.sets));
  const newest = summaries[0];
  if (!newest) return false;

  const sameWeight = summaries.every(
    (summary) => summary.workingWeight === newest.workingWeight,
  );
  const totals = summaries.map((summary) => summary.totalReps).reverse();
  const noIncrease = totals.every(
    (total, index) => total <= (totals[index - 1] ?? Infinity),
  );

  return sameWeight && noIncrease;
}
