<script setup lang="ts">
import type { WorkoutSet, WorkoutUnit } from "~~/shared/types/workouts";

defineProps<{
  sets: WorkoutSet[];
  unit: WorkoutUnit;
}>();
</script>

<template>
  <div class="space-y-1 text-sm">
    <p class="font-medium text-muted">Last time</p>
    <ul class="flex flex-wrap gap-x-4 gap-y-1 tabular-nums text-highlighted">
      <li v-for="set in sets" :key="set.id">
        {{ set.weight }} {{ unit }} × {{ set.reps }}
      </li>
    </ul>
  </div>
</template>
