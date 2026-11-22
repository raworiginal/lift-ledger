<script setup lang="ts">
import type { WorkoutUnit } from "~~/shared/types/workouts";
import { startWorkoutSchema } from "~~/shared/validation/workouts";

const props = defineProps<{
  open: boolean;
  defaultDate: string;
  today: string;
  pending: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
  submit: [values: { date: string; focus: string; unit: WorkoutUnit }];
}>();

const state = reactive<{ date: string; focus: string; unit: WorkoutUnit }>({
  date: props.defaultDate,
  focus: "",
  unit: "lb",
});

const schema = computed(() => startWorkoutSchema(props.today));

const unitItems: Array<{ label: string; value: WorkoutUnit }> = [
  { label: "Pounds (lb)", value: "lb" },
  { label: "Kilograms (kg)", value: "kg" },
];

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    state.date = props.defaultDate;
    state.focus = "";
    state.unit = "lb";
  },
);

function onSubmit() {
  emit("submit", {
    date: state.date,
    focus: state.focus.trim(),
    unit: state.unit,
  });
}
</script>

<template>
  <UModal
    :open="open"
    title="Start a workout"
    description="Pick the date, what you're training, and the unit."
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />

        <UFormField label="Date" name="date">
          <UInput
            v-model="state.date"
            type="date"
            :max="today"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Focus"
          name="focus"
          help="For example: Push, Legs, Pull"
        >
          <UInput
            v-model="state.focus"
            maxlength="60"
            autocomplete="off"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Unit" name="unit">
          <USelect v-model="state.unit" :items="unitItems" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('update:open', false)"
          >
            Cancel
          </UButton>
          <UButton type="submit" :loading="pending" :disabled="pending">
            Start workout
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
