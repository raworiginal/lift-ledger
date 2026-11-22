import type {
  CompletedWorkoutPage,
  WorkoutSummary,
} from "~~/shared/types/workouts";
import type { AsyncStatus } from "./useCurrentDraft";

const PAGE_SIZE = 20;

export function useWorkoutHistory() {
  const items = ref<WorkoutSummary[]>([]);
  const nextCursor = ref<string | null>(null);
  const status = ref<AsyncStatus>("idle");
  const hasMore = computed(() => nextCursor.value !== null);

  function fetchPage(cursor?: string) {
    return $fetch<CompletedWorkoutPage>("/api/workouts", {
      query: { limit: PAGE_SIZE, cursor },
    });
  }

  async function refresh() {
    status.value = "pending";
    try {
      const page = await fetchPage();
      items.value = page.items;
      nextCursor.value = page.nextCursor;
      status.value = "success";
    } catch {
      status.value = "error";
    }
  }

  async function loadMore() {
    if (!nextCursor.value || status.value === "pending") return;
    status.value = "pending";
    try {
      const page = await fetchPage(nextCursor.value);
      items.value = [...items.value, ...page.items];
      nextCursor.value = page.nextCursor;
      status.value = "success";
    } catch {
      status.value = "error";
    }
  }

  return { items, hasMore, status, loadMore, refresh };
}
