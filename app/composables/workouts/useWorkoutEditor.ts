import type {
  ExerciseOption,
  SaveSetInput,
  SaveState,
  WorkoutDetail,
  WorkoutSet,
  WorkoutStatus,
} from "~~/shared/types/workouts";
import { localDateString } from "~/utils/workout-dates";
import { readApiError } from "~/utils/workout-errors";
import { newWorkoutId } from "~/utils/workout-ids";
import type { AsyncStatus } from "./useCurrentDraft";

interface ExerciseListItem {
  id: string;
  nameEn: string;
  equipment: string | null;
}

export function useWorkoutEditor(workoutId: string) {
  const basePath: string = `/api/workouts/${workoutId}`;

  const detail = ref<WorkoutDetail | null>(null);
  const status = ref<AsyncStatus>("idle");
  const notFound = ref(false);
  const actionError = ref<string | null>(null);
  const setState = ref<SaveState>("idle");
  const selectedExerciseId = ref<string | null>(null);
  const pendingSave = ref<SaveSetInput | null>(null);
  const hasPendingSave = computed(() => setState.value === "saving");

  const pickerResults = ref<ExerciseOption[]>([]);
  const pickerStatus = ref<AsyncStatus>("idle");
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let searchRequest = 0;

  onScopeDispose(() => clearTimeout(searchTimer));

  function currentStatus(): WorkoutStatus {
    return detail.value?.status ?? "draft";
  }

  async function refresh() {
    if (!detail.value) status.value = "pending";
    try {
      detail.value = await $fetch<WorkoutDetail>(basePath);
      notFound.value = false;
      status.value = "success";
    } catch (error) {
      notFound.value = readApiError(error, "").statusCode === 404;
      status.value = "error";
    }
  }

  async function runAction(
    action: () => Promise<unknown>,
    fallback: string,
  ): Promise<boolean> {
    actionError.value = null;
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
  }

  function addExercise(exerciseId: string) {
    selectedExerciseId.value = exerciseId;
    return runAction(
      () =>
        $fetch<unknown>(`${basePath}/exercises`, {
          method: "POST",
          body: { exerciseId, expectedStatus: currentStatus() },
        }),
      "Could not add the exercise.",
    );
  }

  function removeExercise(exerciseId: string) {
    return runAction(
      () =>
        $fetch<unknown>(`${basePath}/exercises/${exerciseId}`, {
          method: "DELETE",
          query: { expectedStatus: currentStatus() },
        }),
      "Could not remove the exercise.",
    );
  }

  async function saveSet(exerciseId: string, weight: string, reps: string) {
    const pending = pendingSave.value;
    const retrying =
      pending !== null &&
      pending.exerciseId === exerciseId &&
      pending.weight === weight &&
      pending.reps === reps;
    const input: SaveSetInput = retrying
      ? pending
      : { id: newWorkoutId(), exerciseId, weight, reps };

    pendingSave.value = input;
    selectedExerciseId.value = exerciseId;
    actionError.value = null;
    setState.value = "saving";

    try {
      await $fetch<unknown>(`${basePath}/sets`, {
        method: "POST",
        body: { ...input, expectedStatus: currentStatus() },
      });
      pendingSave.value = null;
      setState.value = "saved";
    } catch (error) {
      const { statusCode, message } = readApiError(
        error,
        "Could not save the set. Your values are still here.",
      );
      setState.value = "failed";
      actionError.value = message;
      if (statusCode === 409) {
        pendingSave.value = null;
        await refresh();
      }
      return;
    }

    await refresh();
  }

  function updateSet(setId: string, input: { weight?: string; reps?: string }) {
    return runAction(
      () =>
        $fetch<unknown>(`${basePath}/sets/${setId}`, {
          method: "PATCH",
          body: { ...input, expectedStatus: currentStatus() },
        }),
      "Could not update the set.",
    );
  }

  function deleteSet(setId: string) {
    return runAction(
      () =>
        $fetch<unknown>(`${basePath}/sets/${setId}`, {
          method: "DELETE",
          query: { expectedStatus: currentStatus() },
        }),
      "Could not delete the set.",
    );
  }

  function updateMetadata(input: {
    date?: string;
    focus?: string;
    unit?: "kg" | "lb";
  }) {
    return runAction(
      () =>
        $fetch<unknown>(basePath, {
          method: "PATCH",
          body: {
            ...input,
            today: localDateString(),
            expectedStatus: currentStatus(),
          },
        }),
      "Could not update the workout.",
    );
  }

  function complete() {
    if (hasPendingSave.value) return Promise.resolve(false);
    return runAction(
      () => $fetch<unknown>(`${basePath}/complete`, { method: "POST" }),
      "Could not finish the workout.",
    );
  }

  async function discard(): Promise<boolean> {
    actionError.value = null;
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
    }
  }

  function searchExercises(query: string) {
    clearTimeout(searchTimer);
    const request = ++searchRequest;
    searchTimer = setTimeout(async () => {
      pickerStatus.value = "pending";
      try {
        const page = await $fetch<{ items: ExerciseListItem[] }>(
          "/api/exercises",
          { query: { search: query.trim() || undefined, limit: 30 } },
        );
        if (request !== searchRequest) return;
        pickerResults.value = page.items.map((item) => ({
          id: item.id,
          name: item.nameEn,
          equipment: item.equipment,
        }));
        pickerStatus.value = "success";
      } catch {
        if (request === searchRequest) pickerStatus.value = "error";
      }
    }, 200);
  }

  function lastSetFor(exerciseId: string): WorkoutSet | null {
    const group = detail.value?.exercises.find(
      (item) => item.exerciseId === exerciseId,
    );
    return group?.sets.at(-1) ?? null;
  }

  return {
    detail,
    status,
    notFound,
    actionError,
    setState,
    hasPendingSave,
    selectedExerciseId,
    pickerResults,
    pickerStatus,
    refresh,
    addExercise,
    removeExercise,
    saveSet,
    updateSet,
    deleteSet,
    updateMetadata,
    complete,
    discard,
    searchExercises,
    lastSetFor,
  };
}
