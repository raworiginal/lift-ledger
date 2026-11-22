<script setup lang="ts">
import type { ExerciseOption } from "~~/shared/types/workouts";

defineProps<{
  open: boolean;
  query: string;
  results: ExerciseOption[];
  loading: boolean;
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
  search: [query: string];
  select: [exerciseId: string];
}>();
</script>

<template>
  <UModal
    :open="open"
    title="Add an exercise"
    description="Search the catalog and choose an exercise."
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <UInput
          :model-value="query"
          type="search"
          placeholder="Search exercises"
          autocomplete="off"
          class="w-full"
          aria-label="Search exercises"
          @update:model-value="emit('search', String($event ?? ''))"
        />

        <p v-if="loading" class="text-sm text-muted">Searching…</p>
        <p v-else-if="results.length === 0" class="text-sm text-muted">
          No exercises match that search.
        </p>
        <ul v-else class="max-h-96 space-y-1 overflow-y-auto">
          <li v-for="exercise in results" :key="exercise.id">
            <UButton
              block
              color="neutral"
              variant="ghost"
              class="justify-start"
              @click="emit('select', exercise.id)"
            >
              <span class="flex flex-col items-start text-left">
                <span class="text-highlighted">{{ exercise.name }}</span>
                <span v-if="exercise.equipment" class="text-xs text-muted">
                  {{ exercise.equipment.replaceAll("_", " ") }}
                </span>
              </span>
            </UButton>
          </li>
        </ul>
      </div>
    </template>
  </UModal>
</template>
