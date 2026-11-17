<script setup lang="ts">
const { user } = useUserSession();

const shortcuts = computed(() => [
  {
    title: "Private notes",
    description: "Create and manage notes that only you can access.",
    icon: "i-lucide-notebook-pen",
    to: "/app/notes",
  },
  {
    title: "Your profile",
    description: "Update your personal details and manage sign-in methods.",
    icon: "i-lucide-user-round-cog",
    to: "/app/profile",
  },
  ...(user.value?.role === "admin"
    ? [
        {
          title: "Admin panel",
          description: "Manage users and account access.",
          icon: "i-lucide-shield-check",
          to: "/admin",
        },
      ]
    : []),
]);
</script>

<template>
  <UContainer class="py-10 sm:py-14">
    <div class="space-y-8">
      <header class="space-y-2">
        <p class="text-sm font-medium text-primary">Your account</p>
        <h1 class="text-3xl font-semibold text-highlighted">
          Welcome back, {{ user?.name || "there" }}
        </h1>
        <p class="max-w-2xl text-muted">
          Your account is ready. Choose a shortcut below to get started.
        </p>
      </header>

      <div class="grid gap-4 sm:grid-cols-2">
        <UPageCard
          v-for="shortcut in shortcuts"
          :key="shortcut.to"
          :title="shortcut.title"
          :description="shortcut.description"
          :icon="shortcut.icon"
          :to="shortcut.to"
          class="h-full"
        />
      </div>
    </div>
  </UContainer>
</template>
