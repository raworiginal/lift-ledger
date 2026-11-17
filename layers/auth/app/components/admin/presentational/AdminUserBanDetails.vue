<script setup lang="ts">
import type { AdminUser } from "#shared/auth/types/admin";

defineProps<{
  user: AdminUser;
}>();
</script>

<template>
  <UCollapsible
    v-if="user.banned && (user.banReason || user.banExpires)"
    class="mt-2 text-sm"
  >
    <UButton
      color="neutral"
      variant="link"
      size="sm"
      trailing-icon="i-lucide-chevron-down"
      class="px-0"
    >
      Ban details
    </UButton>
    <template #content>
      <dl class="mt-2 space-y-1 rounded-md bg-elevated p-3">
        <div v-if="user.banReason">
          <dt class="font-medium">Reason</dt>
          <dd class="break-words">{{ user.banReason }}</dd>
        </div>
        <div v-if="user.banExpires">
          <dt class="font-medium">Expires</dt>
          <dd>{{ new Date(user.banExpires).toLocaleString() }}</dd>
        </div>
      </dl>
    </template>
  </UCollapsible>
</template>
