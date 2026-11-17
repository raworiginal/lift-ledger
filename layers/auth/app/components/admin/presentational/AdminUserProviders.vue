<script setup lang="ts">
const props = defineProps<{
  providers?: string[] | null;
}>();

const providerLabels: Record<string, string> = {
  credential: "Email / password",
  github: "GitHub",
  google: "Google",
};

function formatProvider(provider: string) {
  return (
    providerLabels[provider] ??
    provider
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
</script>

<template>
  <div class="flex flex-wrap gap-1">
    <UBadge
      v-for="provider in props.providers ?? []"
      :key="provider"
      color="neutral"
      variant="outline"
    >
      {{ formatProvider(provider) }}
    </UBadge>
    <span v-if="!props.providers?.length" class="text-muted">None</span>
  </div>
</template>
