<script setup>
const mode = ref("sign-in");
</script>

<template>
  <div class="hero flex-1">
    <div class="hero-content">
      <div class="flex w-full max-w-md flex-col items-center gap-6">
        <h1 class="mt-2 text-5xl font-bold tracking-tight">Lift Ledger</h1>
        <LoginForm
          v-if="mode === 'sign-in'"
          @switch-to-signup="mode = 'sign-up'"
        />
        <SignupForm v-else @switch-to-login="mode = 'sign-in'" />
      </div>
    </div>
  </div>
</template>
