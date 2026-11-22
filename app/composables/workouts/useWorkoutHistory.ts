import type {
  CompletedWorkoutPage,
  WorkoutSummary,
} from "~~/shared/types/workouts";
import { workoutCacheKey } from "~/utils/workout-cache";
import type { AsyncStatus } from "./useCurrentDraft";

const PAGE_SIZE = 20;

export function useWorkoutHistory() {
  const requestFetch = useRequestFetch();
  const fetchPage = (cursor?: string) =>
    requestFetch<CompletedWorkoutPage>("/api/workouts", {
      query: { limit: PAGE_SIZE, cursor },
    });

  const {
    data: firstPage,
    status: firstStatus,
    refresh: refreshFirstPage,
  } = useAsyncData<CompletedWorkoutPage | null>(
    workoutCacheKey("history"),
    () => fetchPage(),
    { default: () => null },
  );

  const pages = ref<CompletedWorkoutPage[]>([]);
  const loadingMore = ref(false);
  const loadMoreFailed = ref(false);
  let generation = 0;

  watch(
    firstPage,
    (page) => {
      if (!page) return;
      generation++;
      pages.value = [page];
    },
    { flush: "sync" },
  );

  const items = computed<WorkoutSummary[]>(() =>
    pages.value.flatMap((page) => page.items),
  );
  const nextCursor = computed(() => pages.value.at(-1)?.nextCursor ?? null);
  const hasMore = computed(() => nextCursor.value !== null);
  const status = computed<AsyncStatus>(() => {
    if (firstStatus.value === "pending" || loadingMore.value) return "pending";
    if (firstStatus.value === "error" || loadMoreFailed.value) return "error";
    return firstStatus.value;
  });

  async function loadMore() {
    const cursor = nextCursor.value;
    if (!cursor || loadingMore.value || firstStatus.value === "pending") return;

    const requestGeneration = generation;
    loadingMore.value = true;
    loadMoreFailed.value = false;
    try {
      const page = await fetchPage(cursor);
      if (requestGeneration !== generation) return;
      pages.value = [...pages.value, page];
    } catch {
      if (requestGeneration !== generation) return;
      loadMoreFailed.value = true;
    } finally {
      loadingMore.value = false;
    }
  }

  function refresh() {
    loadMoreFailed.value = false;
    return refreshFirstPage();
  }

  function retry() {
    return loadMoreFailed.value ? loadMore() : refresh();
  }

  return { items, hasMore, status, loadMore, refresh, retry };
}
