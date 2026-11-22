import type { WorkoutDetail, WorkoutSet } from "../../shared/types/workouts";

export function numberSetsWithinExercise<
  T extends { exerciseId: string; position: number },
>(sets: T[]): Array<T & { setNumber: number }> {
  const counts = new Map<string, number>();

  return [...sets]
    .sort((a, b) => a.position - b.position)
    .map((set) => {
      const setNumber = (counts.get(set.exerciseId) ?? 0) + 1;
      counts.set(set.exerciseId, setNumber);
      return { ...set, setNumber };
    });
}

export function nextPrefill(
  lastSaved: Pick<WorkoutSet, "weight" | "reps"> | null,
): { weight: string; reps: string } {
  if (!lastSaved) return { weight: "", reps: "" };
  return { weight: lastSaved.weight, reps: String(lastSaved.reps) };
}

export function canFinish(
  detail: Pick<WorkoutDetail, "status" | "exercises">,
): boolean {
  return (
    detail.status === "draft" &&
    detail.exercises.some((group) => group.sets.length > 0)
  );
}
