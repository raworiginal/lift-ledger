import type { WorkoutSummary, WorkoutUnit } from "~~/shared/types/workouts";
import { localDateString } from "~/utils/workout-dates";
import { workoutCacheKey } from "~/utils/workout-cache";

export type AsyncStatus = "idle" | "pending" | "success" | "error";

export function useCurrentDraft() {
  const requestFetch = useRequestFetch();
  const {
    data: draft,
    status,
    refresh,
  } = useAsyncData<WorkoutSummary | null>(
    workoutCacheKey("draft"),
    async () =>
      (await requestFetch<WorkoutSummary | null>("/api/workouts/draft")) ||
      null,
    { default: () => null },
  );

  async function start(input: {
    date: string;
    focus: string;
    unit: WorkoutUnit;
  }): Promise<WorkoutSummary> {
    const workout = await requestFetch<WorkoutSummary>("/api/workouts", {
      method: "POST",
      body: { ...input, today: localDateString() },
    });
    draft.value = workout;
    return workout;
  }

  return { draft, status, refresh, start };
}
