import type { WorkoutSummary, WorkoutUnit } from "~~/shared/types/workouts";
import { localDateString } from "~/utils/workout-dates";

export type AsyncStatus = "idle" | "pending" | "success" | "error";

export function useCurrentDraft() {
  const draft = ref<WorkoutSummary | null>(null);
  const status = ref<AsyncStatus>("idle");

  async function refresh() {
    status.value = "pending";
    try {
      draft.value =
        (await $fetch<WorkoutSummary | null>("/api/workouts/draft")) || null;
      status.value = "success";
    } catch {
      status.value = "error";
    }
  }

  async function start(input: {
    date: string;
    focus: string;
    unit: WorkoutUnit;
  }): Promise<WorkoutSummary> {
    const workout = await $fetch<WorkoutSummary>("/api/workouts", {
      method: "POST",
      body: { ...input, today: localDateString() },
    });
    draft.value = workout;
    return workout;
  }

  return { draft, status, refresh, start };
}
