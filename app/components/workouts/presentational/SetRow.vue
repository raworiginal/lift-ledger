<script setup lang="ts">
import type { WorkoutSet, WorkoutUnit } from "~~/shared/types/workouts";
import {
  assistanceToStored,
  storedToEntry,
} from "~~/shared/exercises/assisted";
import {
  repsInputSchema,
  weightEntrySchema,
} from "~~/shared/validation/workouts";
import { formatSetWeight } from "~/utils/format-weight";
import { firstIssueMessage } from "~/utils/workout-errors";

const props = defineProps<{
  set: WorkoutSet;
  unit: WorkoutUnit;
  assisted?: boolean;
  editable: boolean;
  editing: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  edit: [];
  save: [values: { weight: string; reps: string }];
  cancel: [];
  delete: [];
}>();

const weight = ref("");
const reps = ref("");
const showErrors = ref(false);

watch(
  () => props.editing,
  (editing) => {
    if (!editing) return;
    weight.value = storedToEntry(props.set.weight, props.assisted ?? false);
    reps.value = String(props.set.reps);
    showErrors.value = false;
  },
);

const weightError = computed(() =>
  showErrors.value
    ? firstIssueMessage(weightEntrySchema, weight.value)
    : undefined,
);
const repsError = computed(() =>
  showErrors.value ? firstIssueMessage(repsInputSchema, reps.value) : undefined,
);

function submit() {
  showErrors.value = true;
  if (weightError.value || repsError.value) return;
  emit("save", {
    weight: assistanceToStored(weight.value.trim(), props.assisted ?? false),
    reps: reps.value.trim(),
  });
}
</script>

<template>
  <li
    class="flex flex-wrap items-center gap-3 rounded-md border border-default px-3 py-2"
  >
    <template v-if="!editing">
      <span class="w-14 text-sm text-muted">Set {{ set.setNumber }}</span>
      <span class="flex-1 font-medium text-highlighted tabular-nums">
        {{ formatSetWeight(set.weight, unit, assisted ?? false) }} ×
        {{ set.reps }}
      </span>
      <div v-if="editable" class="flex gap-1">
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          icon="i-lucide-pencil"
          :disabled="disabled"
          :aria-label="`Edit set ${set.setNumber}`"
          @click="emit('edit')"
        >
          Edit
        </UButton>
        <UButton
          size="sm"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          :disabled="disabled"
          :aria-label="`Delete set ${set.setNumber}`"
          @click="emit('delete')"
        >
          Delete
        </UButton>
      </div>
    </template>

    <form
      v-else
      class="flex w-full flex-wrap items-start gap-2"
      @submit.prevent="submit"
    >
      <span class="w-14 pt-2 text-sm text-muted">Set {{ set.setNumber }}</span>
      <UFormField
        :label="assisted ? 'Assistance' : 'Weight'"
        :error="weightError"
        class="w-28"
      >
        <UInput
          v-model="weight"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Reps" :error="repsError" class="w-24">
        <UInput
          v-model="reps"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          class="w-full"
        />
      </UFormField>
      <div class="flex gap-1 pt-6">
        <UButton type="submit" size="sm" :disabled="disabled"
          >Save edit</UButton
        >
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          @click="emit('cancel')"
        >
          Cancel
        </UButton>
      </div>
    </form>
  </li>
</template>
