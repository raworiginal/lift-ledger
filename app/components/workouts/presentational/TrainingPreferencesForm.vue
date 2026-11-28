<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type {
  TrainingPreferences,
  WorkoutUnit,
} from "~~/shared/types/workouts";
import { trainingPreferencesSchema } from "~~/shared/validation/progression";

const props = defineProps<{
  preferences: TrainingPreferences;
  saving: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  submit: [values: TrainingPreferences];
}>();

const fields = reactive({
  repMin: String(props.preferences.repMin),
  repMax: String(props.preferences.repMax),
  unit: props.preferences.unit,
  weightStep: props.preferences.weightStep,
  restMinutes: String(Math.floor(props.preferences.restTimeSeconds / 60)),
  restSeconds: String(props.preferences.restTimeSeconds % 60),
});

watch(
  () => props.preferences,
  (preferences) => {
    fields.repMin = String(preferences.repMin);
    fields.repMax = String(preferences.repMax);
    fields.unit = preferences.unit;
    fields.weightStep = preferences.weightStep;
    fields.restMinutes = String(Math.floor(preferences.restTimeSeconds / 60));
    fields.restSeconds = String(preferences.restTimeSeconds % 60);
  },
);

const parsed = computed(() => ({
  repMin: Number(fields.repMin),
  repMax: Number(fields.repMax),
  unit: fields.unit,
  weightStep: fields.weightStep,
  restTimeSeconds: Number(fields.restMinutes) * 60 + Number(fields.restSeconds),
}));

const unitItems: Array<{ label: string; value: WorkoutUnit }> = [
  { label: "Pounds (lb)", value: "lb" },
  { label: "Kilograms (kg)", value: "kg" },
];

function handleSubmit(event: FormSubmitEvent<TrainingPreferences>) {
  emit("submit", { ...event.data });
}
</script>

<template>
  <UForm
    :schema="trainingPreferencesSchema"
    :state="parsed"
    :disabled="saving"
    class="space-y-4"
    @submit="handleSubmit"
  >
    <p v-if="error" class="text-error" role="alert">{{ error }}</p>

    <div class="flex flex-wrap items-start gap-3">
      <UFormField label="Rep min" name="repMin" class="w-32">
        <UInput
          v-model="fields.repMin"
          type="number"
          name="repMin"
          inputmode="numeric"
          min="1"
          max="100"
          step="1"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Rep max" name="repMax" class="w-32">
        <UInput
          v-model="fields.repMax"
          type="number"
          name="repMax"
          inputmode="numeric"
          min="1"
          max="100"
          step="1"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField label="Main unit" name="unit" class="w-full sm:w-48">
      <USelect
        v-model="fields.unit"
        :items="unitItems"
        name="unit"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="`Weight step (${fields.unit})`"
      name="weightStep"
      class="w-full sm:w-48"
    >
      <UInput
        v-model="fields.weightStep"
        type="text"
        name="weightStep"
        inputmode="decimal"
        autocomplete="off"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Default rest time"
      name="restTimeSeconds"
      description="Set to 0 seconds to turn off the rest timer."
    >
      <div class="flex items-center gap-2">
        <UInput
          v-model="fields.restMinutes"
          type="number"
          name="restMinutes"
          inputmode="numeric"
          min="0"
          max="60"
          step="1"
          aria-label="Rest time minutes"
          class="w-24"
        />
        <span class="text-sm text-muted">min</span>
        <UInput
          v-model="fields.restSeconds"
          type="number"
          name="restSeconds"
          inputmode="numeric"
          min="0"
          max="59"
          step="1"
          aria-label="Rest time seconds"
          class="w-24"
        />
        <span class="text-sm text-muted">sec</span>
      </div>
    </UFormField>

    <UButton type="submit" :loading="saving" :disabled="saving">
      {{ saving ? "Saving..." : "Save training" }}
    </UButton>
  </UForm>
</template>
