<script setup lang="ts">
import type { WorkoutStatus, WorkoutUnit } from "~~/shared/types/workouts";
import { focusSchema, workoutDateSchema } from "~~/shared/validation/workouts";
import { formatWorkoutDate } from "~/utils/workout-dates";
import { firstIssueMessage } from "~/utils/workout-errors";

const props = defineProps<{
  workoutDate: string;
  focus: string;
  unit: WorkoutUnit;
  status: WorkoutStatus;
  today: string;
  canEditUnit: boolean;
  canFinish: boolean;
  editing: boolean;
  busy?: boolean;
}>();

const emit = defineEmits<{
  update: [patch: { date?: string; focus?: string; unit?: WorkoutUnit }];
  finish: [];
  discard: [];
  startEditing: [];
  stopEditing: [];
}>();

const canEdit = computed(() => props.status === "draft" || props.editing);

const detailsOpen = ref(false);
const dateInput = ref("");
const focusInput = ref("");
const unitInput = ref<WorkoutUnit>("lb");
const showErrors = ref(false);

const dateError = computed(() =>
  showErrors.value
    ? firstIssueMessage(workoutDateSchema(props.today), dateInput.value)
    : undefined,
);
const focusError = computed(() =>
  showErrors.value
    ? firstIssueMessage(focusSchema, focusInput.value)
    : undefined,
);

const unitItems: Array<{ label: string; value: WorkoutUnit }> = [
  { label: "Pounds (lb)", value: "lb" },
  { label: "Kilograms (kg)", value: "kg" },
];

function openDetails() {
  dateInput.value = props.workoutDate;
  focusInput.value = props.focus;
  unitInput.value = props.unit;
  showErrors.value = false;
  detailsOpen.value = true;
}

function saveDetails() {
  showErrors.value = true;
  if (dateError.value || focusError.value) return;
  emit("update", {
    date: dateInput.value,
    focus: focusInput.value.trim(),
    ...(props.canEditUnit && unitInput.value !== props.unit
      ? { unit: unitInput.value }
      : {}),
  });
  detailsOpen.value = false;
}
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <UBadge
            :color="status === 'draft' ? 'warning' : 'success'"
            variant="subtle"
          >
            {{ status === "draft" ? "Draft" : "Completed" }}
          </UBadge>
          <h1 class="text-2xl font-semibold text-highlighted">{{ focus }}</h1>
          <p class="text-sm text-muted">
            {{ formatWorkoutDate(workoutDate) }} · {{ unit }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-if="status === 'draft'"
            icon="i-lucide-check"
            :disabled="!canFinish || busy"
            @click="emit('finish')"
          >
            Finish workout
          </UButton>
          <UButton
            v-if="status === 'completed' && !editing"
            icon="i-lucide-pencil"
            variant="soft"
            @click="emit('startEditing')"
          >
            Edit workout
          </UButton>
          <UButton
            v-if="status === 'completed' && editing"
            variant="soft"
            @click="emit('stopEditing')"
          >
            Done editing
          </UButton>
          <UButton
            v-if="canEdit && !detailsOpen"
            color="neutral"
            variant="ghost"
            icon="i-lucide-settings-2"
            @click="openDetails"
          >
            Edit details
          </UButton>
          <UButton
            v-if="canEdit"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            :disabled="busy"
            @click="emit('discard')"
          >
            {{ status === "draft" ? "Discard draft" : "Delete workout" }}
          </UButton>
        </div>
      </div>

      <p v-if="status === 'draft' && !canFinish" class="text-sm text-muted">
        Save at least one set to finish this workout.
      </p>

      <form
        v-if="detailsOpen"
        class="grid gap-4 sm:grid-cols-3"
        @submit.prevent="saveDetails"
      >
        <UFormField label="Date" :error="dateError">
          <UInput v-model="dateInput" type="date" :max="today" class="w-full" />
        </UFormField>
        <UFormField label="Focus" :error="focusError">
          <UInput v-model="focusInput" maxlength="60" class="w-full" />
        </UFormField>
        <UFormField
          label="Unit"
          :help="
            canEditUnit ? undefined : 'Locked after the first set is saved.'
          "
        >
          <USelect
            v-model="unitInput"
            :items="unitItems"
            :disabled="!canEditUnit"
            class="w-full"
          />
        </UFormField>
        <div class="flex gap-2 sm:col-span-3">
          <UButton type="submit" :disabled="busy">Save details</UButton>
          <UButton color="neutral" variant="ghost" @click="detailsOpen = false">
            Cancel
          </UButton>
        </div>
      </form>
    </div>
  </UCard>
</template>
