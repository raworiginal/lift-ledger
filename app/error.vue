<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();

const title = computed(() =>
  props.error.statusCode === 404 ? "Page not found" : "Something went wrong",
);

const description = computed(() =>
  props.error.statusCode === 404
    ? "The page may have moved or the address may be incorrect."
    : "Please try again, or return to the home page.",
);

function goHome() {
  clearError({ redirect: "/" });
}
</script>

<template>
  <NuxtLayout name="default">
    <UContainer class="flex min-h-[60vh] items-center justify-center py-12">
      <UPageCard class="w-full max-w-lg text-center">
        <p class="text-sm font-semibold text-primary">
          Error {{ props.error.statusCode || 500 }}
        </p>
        <h1 class="mt-2 text-3xl font-semibold text-highlighted">
          {{ title }}
        </h1>
        <p class="mt-3 text-muted">{{ description }}</p>
        <UButton class="mt-6" @click="goHome">Back to home</UButton>
      </UPageCard>
    </UContainer>
  </NuxtLayout>
</template>
