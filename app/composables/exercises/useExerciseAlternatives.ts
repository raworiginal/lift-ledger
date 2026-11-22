import type { ExerciseAlternative } from "~/components/exercises/types";

const LOAD_ERROR = "Alternatives could not be loaded. Please try again.";

export function useExerciseAlternatives() {
  const requestFetch = useRequestFetch();
  const openFor = ref<string | null>(null);
  const alternatives = reactive<Record<string, ExerciseAlternative[]>>({});
  const errors = reactive<Record<string, string>>({});
  const loading = reactive<Record<string, boolean>>({});
  const requests = new Map<string, AbortController>();

  function load(exerciseId: string) {
    if (alternatives[exerciseId] || requests.has(exerciseId)) return;

    const controller = new AbortController();
    requests.set(exerciseId, controller);
    loading[exerciseId] = true;
    Reflect.deleteProperty(errors, exerciseId);

    requestFetch<{ alternatives: ExerciseAlternative[] }>(
      `/api/exercises/${exerciseId}/alternatives`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        alternatives[exerciseId] = response.alternatives;
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        errors[exerciseId] = LOAD_ERROR;
      })
      .finally(() => {
        if (requests.get(exerciseId) !== controller) return;
        requests.delete(exerciseId);
        loading[exerciseId] = false;
      });
  }

  function toggle(exerciseId: string) {
    if (openFor.value === exerciseId) {
      openFor.value = null;
      return;
    }
    openFor.value = exerciseId;
    load(exerciseId);
  }

  onScopeDispose(() => {
    for (const controller of requests.values()) controller.abort();
    requests.clear();
  });

  return {
    openFor,
    alternatives,
    errors,
    loading,
    toggle,
    load,
  };
}
