<script setup lang="ts">
import type { SaveState, WorkoutUnit } from "~~/shared/types/workouts";
import {
  repsInputSchema,
  weightInputSchema,
} from "~~/shared/validation/workouts";
import { firstIssueMessage } from "~/utils/workout-errors";

const props = defineProps<{
  prefill: { weight: string; reps: string };
  prefillSourceId: string | null;
  unit: WorkoutUnit;
  state: SaveState;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  add: [values: { weight: string; reps: string }];
}>();

const weight = ref(props.prefill.weight);
const reps = ref(props.prefill.reps);
const showErrors = ref(false);

watch(
  () => props.prefillSourceId,
  () => {
    weight.value = props.prefill.weight;
    reps.value = props.prefill.reps;
  },
);

const weightError = computed(() =>
  showErrors.value
    ? firstIssueMessage(weightInputSchema, weight.value)
    : undefined,
);
const repsError = computed(() =>
  showErrors.value ? firstIssueMessage(repsInputSchema, reps.value) : undefined,
);
const saving = computed(() => props.state === "saving");
const failed = computed(() => props.state === "failed");

function submit() {
  showErrors.value = true;
  if (weightError.value || repsError.value) return;
  emit("add", { weight: weight.value.trim(), reps: reps.value.trim() });
}
</script>

<template>
  <form class="space-y-3 rounded-md bg-elevated p-3" @submit.prevent="submit">
    <div class="flex flex-wrap items-start gap-3">
      <UFormField :label="`Weight (${unit})`" :error="weightError" class="w-32">
        <UInput
          v-model="weight"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="0"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Reps" :error="repsError" class="w-28">
        <UInput
          v-model="reps"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          placeholder="0"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <UButton
        type="submit"
        :loading="saving"
        :disabled="disabled || saving"
        icon="i-lucide-plus"
      >
        {{ failed ? "Retry save" : "Add set" }}
      </UButton>
      <p class="text-sm" aria-live="polite">
        <span v-if="saving" class="text-muted">Saving…</span>
        <span v-else-if="state === 'saved'" class="text-success">Saved</span>
        <span v-else-if="failed" class="text-error">
          Not saved. Your values are still here.
        </span>
        <span v-else class="text-muted">
          Not saved until you tap Add set.
        </span>
      </p>
    </div>
  </form>
</template>
