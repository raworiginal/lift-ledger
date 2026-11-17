<script setup lang="ts">
import type { SocialProvider } from "#shared/auth/types/auth";
import { getSafeLocalRedirect } from "#shared/auth/redirect";

const { loading, error, submit } = useRegister();
const route = useRoute();
const authMode = useRuntimeConfig().public.authMode;
const callbackURL = computed(() => getSafeLocalRedirect(route.query.redirect));
const { data: socialProviders } = await useFetch<SocialProvider[]>(
  "/api/auth/social-providers",
  { default: () => [] },
);
const { loading: socialLoading, error: socialError, signIn } = useSocialLogin();

function handleSocialSignIn(provider: SocialProvider) {
  return signIn(provider, callbackURL.value);
}
</script>

<template>
  <div
    v-if="authMode === 'social-only'"
    class="mx-auto w-full max-w-lg space-y-4"
  >
    <UPageCard>
      <div class="space-y-2 text-center">
        <h1 class="text-xl font-semibold">Create your account</h1>
        <p class="text-sm text-muted">
          Continue with a social provider to sign in or register.
        </p>
      </div>
      <div class="mt-6 space-y-3">
        <UButton
          v-for="provider in socialProviders"
          :key="provider"
          block
          color="neutral"
          variant="outline"
          :loading="socialLoading"
          :disabled="socialLoading"
          @click="handleSocialSignIn(provider)"
        >
          Continue with {{ provider === "google" ? "Google" : "GitHub" }}
        </UButton>
      </div>
      <UAlert
        v-if="socialError"
        class="mt-4"
        color="error"
        variant="subtle"
        role="alert"
        :description="socialError"
      />
    </UPageCard>
  </div>
  <RegisterForm
    v-else
    :loading="loading"
    :error="error"
    :social-providers="socialProviders"
    :social-loading="socialLoading"
    :social-error="socialError"
    @submit="submit"
    @social-sign-in="handleSocialSignIn"
  />
</template>
