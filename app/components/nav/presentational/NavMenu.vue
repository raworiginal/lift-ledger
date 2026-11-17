<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const props = withDefaults(
  defineProps<{ horizontal?: boolean; loggedIn: boolean }>(),
  { horizontal: false },
);

const items = computed<NavigationMenuItem[]>(() =>
  props.loggedIn
    ? [{ label: "App", to: "/app" }]
    : [
        { label: "Login", to: "/login" },
        { label: "Register", to: "/register" },
      ],
);
</script>

<template>
  <UNavigationMenu
    :items="items"
    :orientation="props.horizontal ? 'horizontal' : 'vertical'"
    aria-label="Main navigation"
  />
</template>
