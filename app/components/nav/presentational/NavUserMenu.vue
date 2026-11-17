<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const props = defineProps<{
  user: {
    name: string;
    image?: string | null;
    role?: string | null;
  } | null;
  logoutLoading: boolean;
}>();

const emit = defineEmits<{
  logout: [];
}>();

const items = computed(
  () =>
    [
      [
        ...(props.user
          ? [{ label: `Hello, ${props.user.name}`, type: "label" as const }]
          : []),
        { label: "Profile", to: "/app/profile" },
        ...(props.user?.role === "admin"
          ? [{ label: "Admin Panel", to: "/admin" }]
          : []),
      ],
      [
        {
          label: "Logout",
          disabled: props.logoutLoading,
          onSelect: () => emit("logout"),
        },
      ],
    ] satisfies DropdownMenuItem[][],
);
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      color="neutral"
      variant="ghost"
      :aria-label="`Open menu for ${props.user?.name ?? 'user'}`"
    >
      <UAvatar
        :src="props.user?.image ?? undefined"
        :alt="props.user ? `${props.user.name}'s avatar` : 'User avatar'"
        :text="props.user?.name?.charAt(0).toUpperCase()"
      />
    </UButton>
  </UDropdownMenu>
</template>
