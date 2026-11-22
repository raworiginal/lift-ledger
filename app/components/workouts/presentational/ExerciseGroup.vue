<script setup lang="ts">
import type {
  LastTime,
  SaveState,
  WorkoutSet,
  WorkoutUnit,
} from "~~/shared/types/workouts";
import { formatWorkoutDate } from "~/utils/workout-dates";
import LastTimeSummary from "./LastTimeSummary.vue";
import SetEntryForm from "./SetEntryForm.vue";
import SetRow from "./SetRow.vue";

defineProps<{
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
  unit: WorkoutUnit;
  lastTime: LastTime | null;
  editable: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  prefill: { weight: string; reps: string };
  prefillSourceId: string | null;
  saveState: SaveState;
  editingSetId: string | null;
}>();

const emit = defineEmits<{
  add: [values: { weight: string; reps: string }];
  editSet: [setId: string];
  cancelEdit: [];
  saveSet: [setId: string, values: { weight: string; reps: string }];
  deleteSet: [setId: string];
  remove: [];
}>();
</script>

<template>
  <UCard
    :id="`exercise-${exerciseId}`"
    :class="highlighted ? 'ring-2 ring-primary' : undefined"
  >
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <h2 class="font-semibold text-highlighted">{{ name }}</h2>
          <p v-if="lastTime" class="text-sm text-muted">
            Last: {{ formatWorkoutDate(lastTime.workoutDate) }} ·
            {{ lastTime.sets.length }}
            {{ lastTime.sets.length === 1 ? "set" : "sets" }}
          </p>
        </div>
        <UButton
          v-if="editable && sets.length === 0"
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

      <ol v-if="sets.length" class="space-y-2">
        <SetRow
          v-for="set in sets"
          :key="set.id"
          :set="set"
          :unit="unit"
          :editable="editable"
          :editing="editingSetId === set.id"
          :disabled="disabled"
          @edit="emit('editSet', set.id)"
          @cancel="emit('cancelEdit')"
          @save="(values) => emit('saveSet', set.id, values)"
          @delete="emit('deleteSet', set.id)"
        />
      </ol>
      <p v-else class="text-sm text-muted">No sets yet.</p>

      <LastTimeSummary
        v-if="editable && lastTime"
        :sets="lastTime.sets"
        :unit="lastTime.unit"
      />
      <SetEntryForm
        v-if="editable"
        :prefill="prefill"
        :prefill-source-id="prefillSourceId"
        :unit="unit"
        :state="saveState"
        :disabled="disabled"
        @add="(values) => emit('add', values)"
      />
    </div>
  </UCard>
</template>
