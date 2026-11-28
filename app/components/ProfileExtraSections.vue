<script setup lang="ts">
import { useTrainingPreferences } from "~/composables/preferences/useTrainingPreferences";
import type { TrainingPreferences } from "~~/shared/types/workouts";

const { preferences, status, saveState, saveError, load, save } =
  useTrainingPreferences();
const toast = useToast();

onMounted(load);

async function handleSubmit(values: TrainingPreferences) {
  if (await save(values)) {
    toast.add({ title: "Training preferences saved.", color: "success" });
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <Fieldset title="Training">
      <p class="text-sm text-muted">
        Set your default rest time and training preferences for every exercise.
      </p>

      <div
        v-if="status === 'error' && !preferences"
        class="flex flex-wrap items-center justify-between gap-2"
        role="alert"
      >
        <p class="text-sm text-error">
          Could not load your training preferences.
        </p>
        <UButton size="sm" color="neutral" variant="outline" @click="load()">
          Try again
        </UButton>
      </div>
      <p v-else-if="!preferences" class="text-sm text-muted" role="status">
        Loading your training preferences…
      </p>
      <TrainingPreferencesForm
        v-else
        :preferences="preferences"
        :saving="saveState === 'saving'"
        :error="saveError"
        @submit="handleSubmit"
      />
    </Fieldset>
  </div>
</template>
