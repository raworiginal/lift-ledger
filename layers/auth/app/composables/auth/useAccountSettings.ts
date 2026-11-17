import type { SocialProvider } from "#shared/auth/types/auth";
import { getErrorMessage } from "#layers/auth/app/utils/error";

type LinkedAccount = {
  id: string;
  providerId: string;
  accountId: string;
};

type UserSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  current: boolean;
};

type DeleteUserClient = {
  deleteUser: (input?: { password?: string }) => Promise<{
    error?: { message?: string } | null;
  }>;
};

export function useAccountSettings() {
  const requestFetch = useAuthRequestFetch();
  const accounts = ref<LinkedAccount[]>([]);
  const sessions = ref<UserSession[]>([]);
  const providers = ref<SocialProvider[]>([]);
  const loading = ref(false);
  const action = ref(false);
  const loadError = ref<string | null>(null);
  const actionError = ref<string | null>(null);
  const successMessage = ref<string | null>(null);
  const deleting = ref(false);

  const hasPassword = computed(() =>
    accounts.value.some((account) => account.providerId === "credential"),
  );

  async function load() {
    loading.value = true;
    loadError.value = null;
    try {
      const [accountResult, sessionResult, providerResult] = await Promise.all([
        requestFetch<{ accounts: LinkedAccount[] }>("/api/account/accounts"),
        requestFetch<{ sessions: UserSession[] }>("/api/account/sessions"),
        requestFetch<SocialProvider[]>("/api/auth/social-providers"),
      ]);
      accounts.value = accountResult.accounts;
      sessions.value = sessionResult.sessions;
      providers.value = providerResult;
    } catch (error) {
      loadError.value = getErrorMessage(error);
    } finally {
      loading.value = false;
    }
  }

  async function linkAccount(provider: SocialProvider) {
    action.value = true;
    actionError.value = null;
    successMessage.value = null;
    try {
      const client = useAuthClient();
      if (!client) throw new Error("Authentication is not available.");
      const result = await client.linkSocial({
        provider,
        callbackURL: "/app/profile",
      });
      if (result.error) throw new Error(result.error.message);
    } catch (error) {
      actionError.value = getErrorMessage(error);
    } finally {
      action.value = false;
    }
  }

  async function unlinkAccount(accountId: string) {
    action.value = true;
    actionError.value = null;
    successMessage.value = null;
    try {
      await requestFetch("/api/account/unlink", {
        method: "POST",
        body: { accountId },
      });
      successMessage.value = "Sign-in account unlinked.";
      await load();
    } catch (error) {
      actionError.value = getErrorMessage(error);
    } finally {
      action.value = false;
    }
  }

  async function revokeSession(sessionId: string) {
    action.value = true;
    actionError.value = null;
    successMessage.value = null;
    try {
      const result = await requestFetch<{ current: boolean }>(
        "/api/account/sessions/revoke",
        { method: "POST", body: { sessionId } },
      );
      if (result.current) {
        await useUserSession().signOut();
        await navigateTo("/login");
        return;
      }
      successMessage.value = "Session revoked.";
      await load();
    } catch (error) {
      actionError.value = getErrorMessage(error);
    } finally {
      action.value = false;
    }
  }

  async function revokeOtherSessions() {
    action.value = true;
    actionError.value = null;
    successMessage.value = null;
    try {
      await requestFetch("/api/account/sessions/revoke-others", {
        method: "POST",
        body: {},
      });
      successMessage.value = "Other sessions revoked.";
      await load();
    } catch (error) {
      actionError.value = getErrorMessage(error);
    } finally {
      action.value = false;
    }
  }

  async function deleteAccount(password?: string) {
    deleting.value = true;
    actionError.value = null;
    const client = useAuthClient();
    try {
      if (!client) throw new Error("Authentication is not available.");
      // deleteUser is supplied by Better Auth when user.deleteUser.enabled is
      // enabled in server configuration. Keep the dependency visible here so
      // the UI can be shipped independently of that deployment setting.
      const deleteUser = (client as typeof client & DeleteUserClient)
        .deleteUser;
      if (typeof deleteUser !== "function") {
        throw new Error("Account deletion is not enabled on this server.");
      }
      const result = password
        ? await deleteUser({ password })
        : await deleteUser();
      if (result.error) throw new Error(result.error.message);
      await useUserSession().fetchSession({ force: true });
      await navigateTo("/login");
    } catch (error) {
      actionError.value = getErrorMessage(error);
    } finally {
      deleting.value = false;
    }
  }

  return {
    accounts,
    sessions,
    providers,
    loading,
    action,
    deleting,
    loadError,
    actionError,
    successMessage,
    hasPassword,
    load,
    linkAccount,
    unlinkAccount,
    revokeSession,
    revokeOtherSessions,
    deleteAccount,
  };
}
