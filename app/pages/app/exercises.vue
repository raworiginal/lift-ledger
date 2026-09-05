<script setup lang="ts">
const {
  data: exercises,
  pending,
  error,
} = await useAuthAsyncData("exercises", (requestFetch) =>
  requestFetch("/api/exercises"),
);
console.log(exercises);
</script>

<template>
  <div v-if="pending">Loading exercises...</div>
  <div v-else-if="error">failed to load exercises</div>
  <table class="table" v-else>
    <thead>
      <tr>
        <th></th>
        <th>Equipment</th>
        <th>Name</th>
        <th>Movement Pattern</th>
      </tr>
    </thead>
    <tr v-for="exercise in exercises" :key="exercise.id">
      <th></th>
      <td>{{ exercise.equipment }}</td>
      <td>{{ exercise.name }}</td>
      <td>
        {{ exercise.movementPatterns.split("_").join(" ") }}
      </td>
    </tr>
  </table>
</template>
