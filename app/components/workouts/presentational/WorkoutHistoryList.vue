<script setup lang="ts">
import type { WorkoutSummary } from "~~/shared/types/workouts";
import { formatWorkoutDate } from "~/utils/workout-dates";

defineProps<{
  items: WorkoutSummary[];
  hasMore: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  loadMore: [];
  open: [id: string];
}>();
</script>

<template>
  <div class="space-y-4">
    <p v-if="!loading && items.length === 0" class="text-muted">
      No completed workouts yet. Finished workouts will show up here.
    </p>

    <ul v-else class="space-y-2">
      <li v-for="workout in items" :key="workout.id">
        <UCard>
          <button
            type="button"
            class="flex w-full flex-wrap items-center justify-between gap-3 text-left"
            @click="emit('open', workout.id)"
          >
            <span class="space-y-1">
              <span class="block font-semibold text-highlighted">
                {{ workout.focus }}
              </span>
              <span class="block text-sm text-muted">
                {{ formatWorkoutDate(workout.workoutDate) }}
              </span>
            </span>
            <span class="text-sm text-muted tabular-nums">
              {{ workout.setCount }}
              {{ workout.setCount === 1 ? "set" : "sets" }}
            </span>
          </button>
        </UCard>
      </li>
    </ul>

    <div v-if="hasMore" class="flex justify-center">
      <UButton
        color="neutral"
        variant="outline"
        :loading="loading"
        :disabled="loading"
        @click="emit('loadMore')"
      >
        Load more
      </UButton>
    </div>
  </div>
</template>
