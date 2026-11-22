import { heatmapCells } from "~~/shared/activity/heatmap";
import type { WorkoutActivity } from "~~/shared/types/workouts";
import { localDateString } from "~/utils/workout-dates";
import type { AsyncStatus } from "./useCurrentDraft";

export function useActivity() {
  const today = ref("");
  const activeDates = ref<string[]>([]);
  const status = ref<AsyncStatus>("idle");

  const cells = computed(() =>
    today.value ? heatmapCells(today.value, activeDates.value) : [],
  );

  async function refresh() {
    today.value = localDateString();
    status.value = "pending";
    try {
      const activity = await $fetch<WorkoutActivity>("/api/workouts/activity", {
        query: { today: today.value },
      });
      activeDates.value = activity.activeDates;
      status.value = "success";
    } catch {
      status.value = "error";
    }
  }

  return { cells, status, refresh };
}
