<script setup lang="ts">
defineProps<{
  disabled?: boolean;
  title: string;
}>();
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold">{{ title }}</h2>
    </template>
    <fieldset :disabled="disabled" class="space-y-4">
      <slot />
    </fieldset>
  </UCard>
</template>
