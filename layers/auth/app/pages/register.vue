<script setup lang="ts">
import type { SocialProvider } from "#shared/auth/types/auth";
import { getSafeLocalRedirect } from "#shared/auth/redirect";

definePageMeta({ layout: "auth" });

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
  <RegisterForm
    :auth-mode="authMode"
    :loading="loading"
    :error="error"
    :social-providers="socialProviders"
    :social-loading="socialLoading"
    :social-error="socialError"
    @submit="submit"
    @social-sign-in="handleSocialSignIn"
  />
</template>
