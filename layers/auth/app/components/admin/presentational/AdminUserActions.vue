<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { AdminUser } from "#shared/auth/types/admin";

const props = defineProps<{
  user: AdminUser;
}>();
const passwordAuthEnabled =
  useRuntimeConfig().public.authMode !== "social-only";

const emit = defineEmits<{
  edit: [user: AdminUser];
  resetPassword: [user: AdminUser];
  ban: [user: AdminUser];
  unban: [user: AdminUser];
  remove: [user: AdminUser];
  viewSessions: [user: AdminUser];
}>();

const items = computed<DropdownMenuItem[][]>(() => [
  [
    { label: "Edit", onSelect: () => emit("edit", props.user) },
    ...(passwordAuthEnabled
      ? [
          {
            label: "Reset password",
            onSelect: () => emit("resetPassword", props.user),
          },
        ]
      : []),
    props.user.banned
      ? { label: "Unban", onSelect: () => emit("unban", props.user) }
      : { label: "Ban", onSelect: () => emit("ban", props.user) },
    {
      label: "View sessions",
      onSelect: () => emit("viewSessions", props.user),
    },
  ],
  [
    {
      label: "Remove",
      color: "error",
      onSelect: () => emit("remove", props.user),
    },
  ],
]);
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="outline"
      size="sm"
      :aria-label="`Actions for ${props.user.name}`"
    >
      Actions
    </UButton>
  </UDropdownMenu>
</template>
