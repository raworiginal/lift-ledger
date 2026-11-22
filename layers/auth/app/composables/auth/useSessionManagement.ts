import type { UserSession } from "#shared/auth/types/account";
import { getErrorMessage } from "#layers/auth/app/utils/error";
import type { useAccountFeedback } from "./useAccountFeedback";

export function useSessionManagement(
  feedback: ReturnType<typeof useAccountFeedback>,
) {
  const requestFetch = useAuthRequestFetch();
  const sessions = ref<UserSession[]>([]);
  const loading = ref(false);
  const loadError = ref<string | null>(null);

  async function load() {
    loading.value = true;
    loadError.value = null;
    try {
      const result = await requestFetch<{ sessions: UserSession[] }>(
        "/api/account/sessions",
      );
      sessions.value = result.sessions;
    } catch (error) {
      loadError.value = getErrorMessage(error);
    } finally {
      loading.value = false;
    }
  }

  async function revokeSession(sessionId: string) {
    await feedback.runAction(async () => {
      const result = await requestFetch<{ current: boolean }>(
        "/api/account/sessions/revoke",
        { method: "POST", body: { sessionId } },
      );
      if (result.current) {
        await useUserSession().signOut();
        await navigateTo("/login");
        return;
      }
      feedback.showSuccess("Session revoked.");
      await load();
    });
  }

  async function revokeOtherSessions() {
    await feedback.runAction(async () => {
      await requestFetch("/api/account/sessions/revoke-others", {
        method: "POST",
        body: {},
      });
      feedback.showSuccess("Other sessions revoked.");
      await load();
    });
  }

  return {
    sessions: readonly(sessions),
    loading: readonly(loading),
    loadError: readonly(loadError),
    load,
    revokeSession,
    revokeOtherSessions,
  };
}
