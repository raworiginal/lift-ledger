<script setup lang="ts">
import ProgressionRow from "~/components/workouts/presentational/ProgressionRow.vue";
import type { AsyncStatus } from "~/composables/workouts/useCurrentDraft";
import type {
  ExerciseProgression,
  TrainingPreferences,
} from "~~/shared/types/workouts";
import { formatWeightOneDecimal } from "~/utils/format-weight";

const props = defineProps<{
  items: ExerciseProgression[];
  preferences: TrainingPreferences | null;
  status: AsyncStatus;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const readyCount = computed(
  () => props.items.filter((item) => item.status === "ready").length,
);
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="space-y-1">
          <h2 class="font-semibold text-highlighted">Progression</h2>
          <p v-if="preferences" class="text-sm text-muted">
            Range {{ preferences.repMin }}–{{ preferences.repMax }} · +{{
              formatWeightOneDecimal(preferences.weightStep)
            }}
            {{ preferences.unit }} ·
            <ULink to="/app/profile" class="text-primary">Change</ULink>
          </p>
        </div>
        <p
          v-if="status === 'success' && items.length > 0"
          class="text-sm text-muted tabular-nums"
        >
          {{ readyCount }} ready
        </p>
      </div>

      <div
        v-if="status === 'error'"
        class="flex flex-wrap items-center justify-between gap-2"
        role="alert"
      >
        <p class="text-sm text-error">Could not load your progression.</p>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          @click="emit('retry')"
        >
          Try again
        </UButton>
      </div>
      <p
        v-else-if="status === 'idle' || status === 'pending'"
        class="text-sm text-muted"
        role="status"
      >
        Loading your progression…
      </p>
      <template v-else>
        <ul v-if="items.length > 0" class="divide-y divide-default">
          <ProgressionRow
            v-for="item in items"
            :key="item.exerciseId"
            :item="item"
          />
        </ul>
        <p v-else class="text-sm text-muted">
          No exercises trained in the last 28 days. Finish a workout to see your
          progression here.
        </p>
      </template>
    </div>
  </UCard>
</template>
