import type { SaveState, TrainingPreferences } from "~~/shared/types/workouts";
import { readApiError } from "~/utils/workout-errors";

export function useTrainingPreferences() {
  const { user } = useUserSession();
  const requestFetch = useRequestFetch();
  const saveState = ref<SaveState>("idle");
  const saveError = ref<string | null>(null);

  const {
    data: preferences,
    status,
    refresh,
  } = useAsyncData<TrainingPreferences | null>(
    ["preferences", user.value?.id ?? "anonymous", "training"].join(":"),
    () => requestFetch<TrainingPreferences>("/api/preferences/training"),
    { default: () => null, immediate: false },
  );

  function load() {
    return refresh();
  }

  async function save(values: TrainingPreferences): Promise<boolean> {
    saveState.value = "saving";
    saveError.value = null;
    try {
      preferences.value = await requestFetch<TrainingPreferences>(
        "/api/preferences/training",
        { method: "PUT", body: values },
      );
      saveState.value = "saved";
      return true;
    } catch (error) {
      saveError.value = readApiError(
        error,
        "Could not save your training preferences. Your values are still here.",
      ).message;
      saveState.value = "failed";
      return false;
    }
  }

  return { preferences, status, saveState, saveError, load, save };
}
