<script setup lang="ts">
import type { Exercise, ExerciseAlternative } from "./types";

defineProps<{
  exercise: Exercise;
  alternatives?: ExerciseAlternative[];
  alternativeError?: string;
  alternativesOpen: boolean;
  alternativesLoading: boolean;
}>();

const emit = defineEmits<{
  toggleAlternatives: [id: string];
}>();

function readable(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function imageFor(exercise: Exercise): string | undefined {
  const flatImages = exercise.images.flat;
  return flatImages?.main ?? flatImages?.start ?? flatImages?.peak;
}
</script>

<template>
  <UCard>
    <div class="flex gap-4">
      <img
        v-if="imageFor(exercise)"
        :src="imageFor(exercise)"
        :alt="exercise.nameEn"
        class="size-20 shrink-0 rounded-md bg-elevated object-cover sm:size-24"
        loading="lazy"
      />
      <div class="min-w-0 flex-1 space-y-2">
        <div>
          <h2 class="font-semibold text-highlighted">
            {{ exercise.nameEn }}
          </h2>
          <p class="text-sm text-muted">
            {{ exercise.descriptionEn }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs text-muted">
          <span>{{ readable(exercise.category) }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ readable(exercise.forceType) }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ readable(exercise.mechanic) }}</span>
          <span v-if="exercise.equipment" aria-hidden="true">·</span>
          <span v-if="exercise.equipment">
            {{ readable(exercise.equipment) }}
          </span>
        </div>
        <div class="space-y-1 text-xs">
          <p>
            <span class="font-medium text-highlighted">Primary: </span>
            <span class="text-muted">
              {{
                exercise.primaryMuscles
                  .map((muscle) => muscle.nameEn)
                  .join(", ") || "Not specified"
              }}
            </span>
          </p>
          <p>
            <span class="font-medium text-highlighted">Secondary: </span>
            <span class="text-muted">
              {{
                exercise.secondaryMuscles
                  .map((muscle) => muscle.nameEn)
                  .join(", ") || "Not specified"
              }}
            </span>
          </p>
        </div>
      </div>
    </div>

    <div class="mt-4">
      <UButton
        type="button"
        size="sm"
        color="neutral"
        variant="outline"
        :loading="alternativesLoading"
        @click="emit('toggleAlternatives', exercise.id)"
      >
        {{ alternativesOpen ? "Hide alternatives" : "Suggest alternatives" }}
      </UButton>
    </div>

    <div v-if="alternativesOpen" class="mt-4 border-t border-muted pt-4">
      <p v-if="alternativeError" role="alert" class="text-sm text-error">
        {{ alternativeError }}
      </p>
      <p v-else-if="alternativesLoading" class="text-sm text-muted">
        Finding similar exercises…
      </p>
      <p v-else-if="alternatives?.length === 0" class="text-sm text-muted">
        No similar exercises were found.
      </p>
      <ul v-else-if="alternatives" class="space-y-3">
        <li
          v-for="alternative in alternatives"
          :key="alternative.id"
          class="space-y-1"
        >
          <p class="font-medium text-highlighted">
            {{ alternative.nameEn }}
          </p>
          <p class="text-sm text-muted">
            Shares
            {{ alternative.similarity.sharedMuscles.map(readable).join(", ") }}
            · same {{ readable(alternative.mechanic) }} mechanic
            <span v-if="alternative.similarity.sameVariationGroup">
              · same exercise variation group
            </span>
          </p>
        </li>
      </ul>
    </div>
  </UCard>
</template>
