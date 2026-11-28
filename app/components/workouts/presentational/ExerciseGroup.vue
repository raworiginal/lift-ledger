<script setup lang="ts">
import type {
  LastTime,
  SaveState,
  WorkoutSet,
  WorkoutUnit,
} from "~~/shared/types/workouts";
import { formatSetWeight } from "~/utils/format-weight";
import { formatWorkoutDate } from "~/utils/workout-dates";
import LastTimeSummary from "./LastTimeSummary.vue";
import SetEntryForm from "./SetEntryForm.vue";
import SetRow from "./SetRow.vue";

const props = defineProps<{
  exerciseId: string;
  name: string;
  assisted?: boolean;
  sets: WorkoutSet[];
  unit: WorkoutUnit;
  lastTime: LastTime | null;
  editable: boolean;
  disabled?: boolean;
  focused: boolean;
  prefill: { weight: string; reps: string };
  prefillSourceId: string | null;
  saveState: SaveState;
  saveError?: string | null;
  editingSetId: string | null;
}>();

const emit = defineEmits<{
  add: [values: { weight: string; reps: string }];
  editSet: [setId: string];
  cancelEdit: [];
  saveSet: [setId: string, values: { weight: string; reps: string }];
  deleteSet: [setId: string];
  remove: [];
  focus: [];
}>();

function focusCard() {
  if (!props.focused) emit("focus");
}
</script>

<template>
  <UCard
    :id="`exercise-${exerciseId}`"
    :class="focused && editable ? 'ring-2 ring-primary' : undefined"
    :role="focused ? undefined : 'button'"
    :tabindex="focused ? undefined : 0"
    @click="focusCard"
    @keydown.enter.prevent="focusCard"
    @keydown.space.prevent="focusCard"
  >
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div
          v-if="!focused"
          class="exercise-summary flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1"
        >
          <h2 class="font-semibold text-highlighted">{{ name }}</h2>
          <template v-if="sets.length">
            <span
              v-for="set in sets"
              :key="set.id"
              class="exercise-summary-set inline-flex items-center gap-2 text-sm tabular-nums text-highlighted"
            >
              <span class="text-muted" aria-hidden="true">·</span>
              {{ formatSetWeight(set.weight, unit, assisted ?? false) }} ×
              {{ set.reps }}
            </span>
          </template>
          <span v-else class="text-sm text-muted">No sets yet.</span>
        </div>
        <div v-else class="min-w-0 space-y-1">
          <h2 class="font-semibold text-highlighted">{{ name }}</h2>
          <p v-if="lastTime" class="text-sm text-muted">
            Last: {{ formatWorkoutDate(lastTime.workoutDate) }} ·
            {{ lastTime.sets.length }}
            {{ lastTime.sets.length === 1 ? "set" : "sets" }}
          </p>
        </div>
        <UButton
          v-if="focused && editable && sets.length === 0"
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          :disabled="disabled"
          @click="emit('remove')"
        >
          Remove exercise
        </UButton>
      </div>

      <ol v-if="sets.length" v-show="focused" class="space-y-2">
        <SetRow
          v-for="set in sets"
          :key="set.id"
          :set="set"
          :unit="unit"
          :assisted="assisted"
          :editable="editable && focused"
          :editing="editingSetId === set.id"
          :disabled="disabled"
          @edit="emit('editSet', set.id)"
          @cancel="emit('cancelEdit')"
          @save="(values) => emit('saveSet', set.id, values)"
          @delete="emit('deleteSet', set.id)"
        />
      </ol>
      <p v-if="focused && !sets.length" class="text-sm text-muted">
        No sets yet.
      </p>

      <div v-show="focused" class="space-y-4">
        <LastTimeSummary
          v-if="editable && lastTime"
          :sets="lastTime.sets"
          :unit="lastTime.unit"
          :assisted="assisted"
        />
        <SetEntryForm
          v-if="editable"
          :prefill="prefill"
          :prefill-source-id="prefillSourceId"
          :unit="unit"
          :assisted="assisted"
          :state="saveState"
          :error="saveError"
          :disabled="disabled"
          @add="(values) => emit('add', values)"
        />
      </div>
    </div>
  </UCard>
</template>
