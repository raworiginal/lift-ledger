import type {
  SaveSetInput,
  SaveState,
  WorkoutDetail,
  WorkoutStatus,
} from "~~/shared/types/workouts";
import { localDateString } from "~/utils/workout-dates";
import { readApiError } from "~/utils/workout-errors";
import { newWorkoutId } from "~/utils/workout-ids";
import { workoutCacheKey } from "~/utils/workout-cache";
import type { AsyncStatus } from "./useCurrentDraft";

export type MetadataState = "idle" | "pending" | "success" | "error";

interface SaveRecord {
  attempt: number;
  state: SaveState;
  input: SaveSetInput | null;
  error: string | null;
}

export function useWorkoutEditor(workoutId: string) {
  const basePath: string = `/api/workouts/${workoutId}`;
  const requestFetch = useRequestFetch();

  const {
    data: loaded,
    status: loadStatus,
    error: loadError,
    refresh: reload,
    clear: cancelReads,
  } = useAsyncData<WorkoutDetail | null>(
    workoutCacheKey("detail", workoutId),
    (_nuxtApp, { signal }) => requestFetch<WorkoutDetail>(basePath, { signal }),
    { default: () => null },
  );

  const detail = ref<WorkoutDetail | null>(loaded.value);
  watch(
    loaded,
    (value) => {
      if (value) detail.value = value;
    },
    { flush: "sync" },
  );

  const actionError = ref<string | null>(null);
  const selectedExerciseId = ref<string | null>(null);
  const saves = reactive<Record<string, SaveRecord>>({});
  const metadata = reactive<{ state: MetadataState; error: string | null }>({
    state: "idle",
    error: null,
  });
  const activeMutations = ref(0);
  let attemptCounter = 0;

  const busy = computed(
    () =>
      activeMutations.value > 0 ||
      Object.values(saves).some((save) => save.state === "saving"),
  );
  const notFound = computed(
    () => !detail.value && readApiError(loadError.value, "").statusCode === 404,
  );
  const refreshError = computed(() =>
    loadError.value && detail.value
      ? "The workout could not be refreshed. Showing the last loaded version."
      : null,
  );
  const status = computed<AsyncStatus>(() => loadStatus.value);

  let inFlight: Promise<void> | null = null;
  let refreshQueued = false;

  function refresh(): Promise<void> {
    if (inFlight) {
      refreshQueued = true;
      return inFlight;
    }
    inFlight = (async () => {
      do {
        refreshQueued = false;
        await reload();
      } while (refreshQueued);
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  onScopeDispose(() => cancelReads());

  function currentStatus(): WorkoutStatus {
    return detail.value?.status ?? "draft";
  }

  async function mutate(
    action: () => Promise<unknown>,
    fallback: string,
  ): Promise<boolean> {
    actionError.value = null;
    activeMutations.value++;
    try {
      try {
        await action();
      } catch (error) {
        const { statusCode, message } = readApiError(error, fallback);
        actionError.value = message;
        if (statusCode === 409) await refresh();
        return false;
      }
      await refresh();
      return true;
    } finally {
      activeMutations.value--;
    }
  }

  function addExercise(exerciseId: string) {
    selectedExerciseId.value = exerciseId;
    return mutate(
      () =>
        $fetch<unknown>(`${basePath}/exercises`, {
          method: "POST",
          body: { exerciseId, expectedStatus: currentStatus() },
        }),
      "Could not add the exercise.",
    );
  }

  function removeExercise(exerciseId: string) {
    if (saves[exerciseId]?.state === "saving") return Promise.resolve(false);
    return mutate(
      () =>
        $fetch<unknown>(`${basePath}/exercises/${exerciseId}`, {
          method: "DELETE",
          query: { expectedStatus: currentStatus() },
        }),
      "Could not remove the exercise.",
    );
  }

  function saveStateFor(exerciseId: string): SaveState {
    return saves[exerciseId]?.state ?? "idle";
  }

  function saveErrorFor(exerciseId: string): string | null {
    return saves[exerciseId]?.error ?? null;
  }

  async function saveSet(
    exerciseId: string,
    weight: string,
    reps: string,
  ): Promise<boolean> {
    const current = saves[exerciseId];
    if (current?.state === "saving") return false;

    const previous = current?.input;
    const retrying =
      previous != null && previous.weight === weight && previous.reps === reps;
    const input: SaveSetInput = retrying
      ? previous
      : { id: newWorkoutId(), exerciseId, weight, reps };
    const attempt = ++attemptCounter;

    saves[exerciseId] = { attempt, state: "saving", input, error: null };
    selectedExerciseId.value = exerciseId;

    try {
      await $fetch<unknown>(`${basePath}/sets`, {
        method: "POST",
        body: { ...input, expectedStatus: currentStatus() },
      });
    } catch (error) {
      if (saves[exerciseId]?.attempt !== attempt) return false;
      const { statusCode, message } = readApiError(
        error,
        "Could not save the set. Your values are still here.",
      );
      saves[exerciseId] = {
        attempt,
        state: "failed",
        input: statusCode === 409 ? null : input,
        error: message,
      };
      if (statusCode === 409) await refresh();
      return false;
    }

    if (saves[exerciseId]?.attempt === attempt) {
      saves[exerciseId] = { attempt, state: "saved", input: null, error: null };
    }
    await refresh();
    return true;
  }

  function updateSet(setId: string, input: { weight?: string; reps?: string }) {
    if (busy.value) return Promise.resolve(false);
    return mutate(
      () =>
        $fetch<unknown>(`${basePath}/sets/${setId}`, {
          method: "PATCH",
          body: { ...input, expectedStatus: currentStatus() },
        }),
      "Could not update the set.",
    );
  }

  function deleteSet(setId: string) {
    if (busy.value) return Promise.resolve(false);
    return mutate(
      () =>
        $fetch<unknown>(`${basePath}/sets/${setId}`, {
          method: "DELETE",
          query: { expectedStatus: currentStatus() },
        }),
      "Could not delete the set.",
    );
  }

  async function updateMetadata(input: {
    date?: string;
    focus?: string;
    unit?: "kg" | "lb";
  }): Promise<boolean> {
    if (busy.value || metadata.state === "pending") return false;

    metadata.state = "pending";
    metadata.error = null;
    activeMutations.value++;
    try {
      await $fetch<unknown>(basePath, {
        method: "PATCH",
        body: {
          ...input,
          today: localDateString(),
          expectedStatus: currentStatus(),
        },
      });
    } catch (error) {
      const { statusCode, message } = readApiError(
        error,
        "Could not update the workout.",
      );
      metadata.state = "error";
      metadata.error = message;
      if (statusCode === 409) await refresh();
      return false;
    } finally {
      activeMutations.value--;
    }

    metadata.state = "success";
    await refresh();
    return true;
  }

  async function complete(): Promise<boolean> {
    if (busy.value) return false;
    return mutate(
      () => $fetch<unknown>(`${basePath}/complete`, { method: "POST" }),
      "Could not finish the workout.",
    );
  }

  async function discard(): Promise<boolean> {
    if (busy.value) return false;
    actionError.value = null;
    activeMutations.value++;
    try {
      await $fetch<unknown>(basePath, {
        method: "DELETE",
        query: { expectedStatus: currentStatus() },
      });
      return true;
    } catch (error) {
      const { statusCode, message } = readApiError(
        error,
        "Could not delete the workout.",
      );
      actionError.value = message;
      if (statusCode === 409) await refresh();
      return false;
    } finally {
      activeMutations.value--;
    }
  }

  function lastSetFor(exerciseId: string) {
    const group = detail.value?.exercises.find(
      (item) => item.exerciseId === exerciseId,
    );
    return group?.sets.at(-1) ?? null;
  }

  return {
    detail,
    status,
    notFound,
    refreshError,
    actionError,
    busy,
    metadata: readonly(metadata),
    selectedExerciseId,
    refresh,
    addExercise,
    removeExercise,
    saveSet,
    saveStateFor,
    saveErrorFor,
    updateSet,
    deleteSet,
    updateMetadata,
    complete,
    discard,
    lastSetFor,
  };
}
