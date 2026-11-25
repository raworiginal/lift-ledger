import type {
  ExerciseProgression,
  TrainingPreferences,
  WorkoutProgression,
} from "~~/shared/types/workouts";
import { workoutCacheKey } from "~/utils/workout-cache";
import { localDateString } from "~/utils/workout-dates";

export function useProgression() {
  const requestFetch = useRequestFetch();
  const {
    data,
    status,
    refresh: refreshProgression,
  } = useAsyncData<WorkoutProgression | null>(
    workoutCacheKey("progression"),
    (_nuxtApp, { signal }) =>
      requestFetch<WorkoutProgression>("/api/workouts/progression", {
        query: { today: localDateString() },
        signal,
      }),
    { default: () => null, immediate: false },
  );

  const preferences = computed<TrainingPreferences | null>(
    () => data.value?.preferences ?? null,
  );
  const items = computed<ExerciseProgression[]>(() => data.value?.items ?? []);

  function refresh() {
    return refreshProgression();
  }

  return { preferences, items, status, refresh };
}
