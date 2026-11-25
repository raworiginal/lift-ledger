<script setup lang="ts">
import type { WorkoutSet, WorkoutUnit } from "~~/shared/types/workouts";
import { formatSetWeight } from "~/utils/format-weight";

defineProps<{
  sets: WorkoutSet[];
  unit: WorkoutUnit;
  assisted?: boolean;
}>();
</script>

<template>
  <div class="space-y-1 text-sm">
    <p class="font-medium text-muted">Last time</p>
    <ul class="flex flex-wrap gap-x-4 gap-y-1 tabular-nums text-highlighted">
      <li v-for="set in sets" :key="set.id">
        {{ formatSetWeight(set.weight, unit, assisted ?? false) }} ×
        {{ set.reps }}
      </li>
    </ul>
  </div>
</template>
