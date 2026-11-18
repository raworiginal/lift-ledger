<script setup lang="ts">
import type { ExerciseFilters, FilterOptions } from "./types";

defineProps<{
  filters: ExerciseFilters;
  options: FilterOptions;
}>();

const emit = defineEmits<{
  change: [patch: Partial<ExerciseFilters>];
}>();

function readable(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}
</script>

<template>
  <section
    aria-label="Exercise filters"
    class="grid gap-4 rounded-lg border border-muted bg-elevated p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9"
  >
    <label class="grid min-w-0 gap-1.5 text-sm xl:col-span-2">
      <span class="font-medium text-highlighted">Search</span>
      <input
        :value="filters.search"
        type="search"
        placeholder="Name or description"
        class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
        @input="
          emit('change', { search: ($event.target as HTMLInputElement).value })
        "
      />
    </label>

    <label class="grid min-w-0 gap-1.5 text-sm">
      <span class="font-medium text-highlighted">Equipment</span>
      <select
        :value="filters.equipment"
        class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
        @change="
          emit('change', {
            equipment: ($event.target as HTMLSelectElement).value,
          })
        "
      >
        <option value="">Any equipment</option>
        <option
          v-for="equipment in options.equipment"
          :key="equipment"
          :value="equipment"
        >
          {{ readable(equipment) }}
        </option>
      </select>
    </label>

    <label class="grid min-w-0 gap-1.5 text-sm">
      <span class="font-medium text-highlighted">Body part</span>
      <select
        :value="filters.bodyPart"
        class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
        @change="
          emit('change', {
            bodyPart: ($event.target as HTMLSelectElement).value,
          })
        "
      >
        <option value="">Any body part</option>
        <option
          v-for="bodyPart in options.bodyParts"
          :key="bodyPart"
          :value="bodyPart"
        >
          {{ readable(bodyPart) }}
        </option>
      </select>
    </label>

    <label class="grid min-w-0 gap-1.5 text-sm">
      <span class="font-medium text-highlighted">Muscle</span>
      <select
        :value="filters.muscle"
        class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
        @change="
          emit('change', { muscle: ($event.target as HTMLSelectElement).value })
        "
      >
        <option value="">All muscles</option>
        <option
          v-for="muscle in options.muscles"
          :key="muscle.id"
          :value="muscle.id"
        >
          {{ muscle.nameEn }}
        </option>
      </select>
    </label>

    <label class="grid min-w-0 gap-1.5 text-sm">
      <span class="font-medium text-highlighted">Muscle role</span>
      <select
        :value="filters.muscleRole"
        :disabled="!filters.muscle"
        class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default disabled:opacity-50"
        @change="
          emit('change', {
            muscleRole: ($event.target as HTMLSelectElement).value,
          })
        "
      >
        <option value="any">Primary or secondary</option>
        <option value="primary">Primary</option>
        <option value="secondary">Secondary</option>
      </select>
    </label>

    <label class="grid min-w-0 gap-1.5 text-sm">
      <span class="font-medium text-highlighted">Force</span>
      <select
        :value="filters.forceType"
        class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
        @change="
          emit('change', {
            forceType: ($event.target as HTMLSelectElement).value,
          })
        "
      >
        <option value="">Any force</option>
        <option
          v-for="forceType in options.forceTypes"
          :key="forceType"
          :value="forceType"
        >
          {{ readable(forceType) }}
        </option>
      </select>
    </label>

    <label class="grid min-w-0 gap-1.5 text-sm">
      <span class="font-medium text-highlighted">Category</span>
      <select
        :value="filters.category"
        class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
        @change="
          emit('change', {
            category: ($event.target as HTMLSelectElement).value,
          })
        "
      >
        <option value="">Any category</option>
        <option
          v-for="category in options.categories"
          :key="category"
          :value="category"
        >
          {{ readable(category) }}
        </option>
      </select>
    </label>

    <label class="grid min-w-0 gap-1.5 text-sm">
      <span class="font-medium text-highlighted">Mechanic</span>
      <select
        :value="filters.mechanic"
        class="w-full min-w-0 rounded-md border border-default bg-default px-3 py-2 text-default"
        @change="
          emit('change', {
            mechanic: ($event.target as HTMLSelectElement).value,
          })
        "
      >
        <option value="">Any mechanic</option>
        <option
          v-for="mechanic in options.mechanics"
          :key="mechanic"
          :value="mechanic"
        >
          {{ readable(mechanic) }}
        </option>
      </select>
    </label>
  </section>
</template>
