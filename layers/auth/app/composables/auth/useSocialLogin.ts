import type { SocialProvider } from "#shared/auth/types/auth";

export function useSocialLogin() {
  const action = useAuthClientAction((client) => client.signIn.social);
  const loading = computed(() => action.status.value === "pending");
  const error = computed(() => action.error.value?.message ?? null);

  async function signIn(provider: SocialProvider, callbackURL: string) {
    await action.execute({
      provider,
      callbackURL,
    });
  }

  return { loading, error, signIn };
}
