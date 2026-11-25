<script setup lang="ts">
import type { SaveState, WorkoutUnit } from "~~/shared/types/workouts";
import {
  assistanceToStored,
  storedToEntry,
} from "~~/shared/exercises/assisted";
import {
  repsInputSchema,
  weightEntrySchema,
} from "~~/shared/validation/workouts";
import { firstIssueMessage } from "~/utils/workout-errors";

const props = defineProps<{
  prefill: { weight: string; reps: string };
  prefillSourceId: string | null;
  unit: WorkoutUnit;
  assisted?: boolean;
  state: SaveState;
  error?: string | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  add: [values: { weight: string; reps: string }];
}>();

const weight = ref(entryWeight(props.prefill.weight));
const reps = ref(props.prefill.reps);
const showErrors = ref(false);
const edited = ref(false);
const submitted = ref<{ weight: string; reps: string } | null>(null);

function entryWeight(stored: string): string {
  return stored === "" ? "" : storedToEntry(stored, props.assisted ?? false);
}

function markEdited() {
  edited.value = true;
}

watch(
  () => props.prefillSourceId,
  () => {
    if (edited.value) return;
    weight.value = entryWeight(props.prefill.weight);
    reps.value = props.prefill.reps;
  },
);

watch(
  () => props.state,
  (state) => {
    if (state !== "saved" || !submitted.value) return;
    const unchangedSinceSubmit =
      weight.value.trim() === submitted.value.weight &&
      reps.value.trim() === submitted.value.reps;
    if (unchangedSinceSubmit) edited.value = false;
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
const saving = computed(() => props.state === "saving");
const failed = computed(() => props.state === "failed");

function submit() {
  showErrors.value = true;
  if (weightError.value || repsError.value) return;
  const entry = { weight: weight.value.trim(), reps: reps.value.trim() };
  submitted.value = entry;
  emit("add", {
    weight: assistanceToStored(entry.weight, props.assisted ?? false),
    reps: entry.reps,
  });
}
</script>

<template>
  <form class="space-y-3 rounded-md bg-elevated p-3" @submit.prevent="submit">
    <div class="flex flex-wrap items-start gap-3">
      <UFormField
        :label="assisted ? `Assistance (${unit})` : `Weight (${unit})`"
        :error="weightError"
        class="w-32"
      >
        <UInput
          v-model="weight"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="0"
          class="w-full"
          @update:model-value="markEdited"
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
          @update:model-value="markEdited"
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
          {{ error ?? "Not saved. Your values are still here." }}
        </span>
        <span v-else class="text-muted">
          Not saved until you tap Add set.
        </span>
      </p>
    </div>
  </form>
</template>
