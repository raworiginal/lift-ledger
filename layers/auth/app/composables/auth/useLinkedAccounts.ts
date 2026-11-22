import type { SocialProvider } from "#shared/auth/types/auth";
import type { LinkedAccount } from "#shared/auth/types/account";
import { getErrorMessage } from "#layers/auth/app/utils/error";
import type { useAccountFeedback } from "./useAccountFeedback";

export function useLinkedAccounts(
  feedback: ReturnType<typeof useAccountFeedback>,
) {
  const requestFetch = useAuthRequestFetch();
  const accounts = ref<LinkedAccount[]>([]);
  const providers = ref<SocialProvider[]>([]);
  const loading = ref(false);
  const loadError = ref<string | null>(null);

  const hasPassword = computed(() =>
    accounts.value.some((account) => account.providerId === "credential"),
  );

  async function load() {
    loading.value = true;
    loadError.value = null;
    try {
      const [accountResult, providerResult] = await Promise.all([
        requestFetch<{ accounts: LinkedAccount[] }>("/api/account/accounts"),
        requestFetch<SocialProvider[]>("/api/auth/social-providers"),
      ]);
      accounts.value = accountResult.accounts;
      providers.value = providerResult;
    } catch (error) {
      loadError.value = getErrorMessage(error);
    } finally {
      loading.value = false;
    }
  }

  async function linkAccount(provider: SocialProvider) {
    await feedback.runAction(async () => {
      const client = useAuthClient();
      if (!client) throw new Error("Authentication is not available.");
      const result = await client.linkSocial({
        provider,
        callbackURL: "/app/profile",
      });
      if (result.error) throw new Error(result.error.message);
    });
  }

  async function unlinkAccount(accountId: string) {
    await feedback.runAction(async () => {
      await requestFetch("/api/account/unlink", {
        method: "POST",
        body: { accountId },
      });
      feedback.showSuccess("Sign-in account unlinked.");
      await load();
    });
  }

  return {
    accounts: readonly(accounts),
    providers: readonly(providers),
    loading: readonly(loading),
    loadError: readonly(loadError),
    hasPassword,
    load,
    linkAccount,
    unlinkAccount,
  };
}
