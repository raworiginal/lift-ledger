<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";

const { ready, loggedIn, user } = useUserSession();
const { loading: logoutLoading, submit: logout } = useLogout();

const navigationItems = computed<NavigationMenuItem[]>(() => [
  {
    label: "Users",
    icon: "i-lucide-users",
    to: "/admin",
  },
]);

const accountItems = computed<DropdownMenuItem[][]>(() => [
  [
    ...(user.value
      ? [{ label: `Signed in as ${user.value.name}`, disabled: true }]
      : []),
    { label: "App", to: "/app", icon: "i-lucide-house" },
    { label: "Profile", to: "/app/profile", icon: "i-lucide-user-round" },
  ],
  [
    {
      label: "Log out",
      icon: "i-lucide-log-out",
      disabled: logoutLoading.value,
      onSelect: () => logout(),
    },
  ],
]);
</script>

<template>
  <UDashboardGroup class="min-h-dvh">
    <UDashboardSidebar collapsible>
      <template #header="{ collapsed }">
        <UButton
          to="/"
          color="neutral"
          variant="ghost"
          :aria-label="collapsed ? 'AppName home' : undefined"
          block
        >
          <UIcon name="i-lucide-shield-check" class="size-5 shrink-0" />
          <span v-if="!collapsed" class="truncate font-semibold">AppName</span>
        </UButton>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems"
          orientation="vertical"
          aria-label="Admin navigation"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          v-if="ready"
          :items="accountItems"
          :content="{ align: 'end' }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            :block="!collapsed"
            :aria-label="`Account menu for ${user?.name ?? 'administrator'}`"
          >
            <UAvatar
              :src="user?.image ?? undefined"
              :alt="user ? `${user.name}'s avatar` : 'Administrator avatar'"
              :text="user?.name?.charAt(0).toUpperCase()"
              size="sm"
            />
            <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left">
              {{ loggedIn ? user?.name : "Account" }}
            </span>
            <UIcon
              v-if="!collapsed"
              name="i-lucide-chevrons-up-down"
              class="size-4 shrink-0 text-muted"
            />
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
