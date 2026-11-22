import type { ExerciseOption } from "~~/shared/types/workouts";
import type { AsyncStatus } from "./useCurrentDraft";

interface ExerciseListItem {
  id: string;
  nameEn: string;
  equipment: string | null;
}

const DEBOUNCE_MS = 200;
const RESULT_LIMIT = 30;

export function useExerciseSearch() {
  const requestFetch = useRequestFetch();
  const query = ref("");
  const results = ref<ExerciseOption[]>([]);
  const status = ref<AsyncStatus>("idle");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;

  function cancel() {
    clearTimeout(timer);
    controller?.abort();
    controller = null;
  }

  async function run(term: string) {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    status.value = "pending";
    try {
      const page = await requestFetch<{ items: ExerciseListItem[] }>(
        "/api/exercises",
        {
          query: { search: term.trim() || undefined, limit: RESULT_LIMIT },
          signal: current.signal,
        },
      );
      if (current.signal.aborted) return;
      results.value = page.items.map((item) => ({
        id: item.id,
        name: item.nameEn,
        equipment: item.equipment,
      }));
      status.value = "success";
    } catch {
      if (current.signal.aborted) return;
      results.value = [];
      status.value = "error";
    }
  }

  function search(term: string) {
    query.value = term;
    clearTimeout(timer);
    status.value = "pending";
    timer = setTimeout(() => void run(term), DEBOUNCE_MS);
  }

  function retry() {
    clearTimeout(timer);
    void run(query.value);
  }

  onScopeDispose(cancel);

  return { query, results, status, search, retry, cancel };
}
