<script setup lang="ts">
import ExerciseCard from "./ExerciseCard.vue";
import type { ExerciseAlternative, ExerciseListResponse } from "./types";

defineProps<{
  results: ExerciseListResponse;
  status: string;
  hasError: boolean;
  openAlternativesFor: string | null;
  alternativesByExercise: Record<string, ExerciseAlternative[]>;
  alternativeErrors: Record<string, string>;
  loadingAlternativesFor: string | null;
}>();

const emit = defineEmits<{
  pageBack: [];
  pageForward: [];
  toggleAlternatives: [id: string];
}>();
</script>

<template>
  <p v-if="hasError" role="alert" class="text-sm text-error">
    Exercises could not be loaded. Please refresh and try again.
  </p>
  <p v-else-if="status === 'pending'" class="text-sm text-muted">
    Loading exercises…
  </p>
  <p v-else-if="results.total === 0" class="text-sm text-muted">
    No exercises match these filters.
  </p>

  <section
    v-else-if="!hasError && status !== 'pending'"
    class="space-y-4"
    aria-label="Exercises"
  >
    <p class="text-sm text-muted">
      Showing {{ results.offset + 1 }}–{{
        Math.min(results.offset + results.items.length, results.total)
      }}
      of {{ results.total }} exercises
    </p>

    <div class="grid gap-4 lg:grid-cols-2">
      <ExerciseCard
        v-for="exercise in results.items"
        :key="exercise.id"
        :exercise="exercise"
        :alternatives="alternativesByExercise[exercise.id]"
        :alternative-error="alternativeErrors[exercise.id]"
        :alternatives-open="openAlternativesFor === exercise.id"
        :alternatives-loading="loadingAlternativesFor === exercise.id"
        @toggle-alternatives="emit('toggleAlternatives', $event)"
      />
    </div>

    <div class="flex items-center justify-between">
      <UButton
        color="neutral"
        variant="outline"
        :disabled="results.offset === 0"
        @click="emit('pageBack')"
      >
        Previous
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        :disabled="results.offset + results.items.length >= results.total"
        @click="emit('pageForward')"
      >
        Next
      </UButton>
    </div>
  </section>
</template>
