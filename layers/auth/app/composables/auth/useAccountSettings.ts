import { useAccountFeedback } from "./useAccountFeedback";
import { useAccountDeletion } from "./useAccountDeletion";
import { useLinkedAccounts } from "./useLinkedAccounts";
import { useSessionManagement } from "./useSessionManagement";

export function useAccountSettings() {
  const feedback = useAccountFeedback();
  const linked = useLinkedAccounts(feedback);
  const sessionManagement = useSessionManagement(feedback);
  const deletion = useAccountDeletion(feedback);

  const loading = computed(
    () => linked.loading.value || sessionManagement.loading.value,
  );
  const loadError = computed(
    () => linked.loadError.value ?? sessionManagement.loadError.value,
  );

  async function load() {
    await Promise.all([linked.load(), sessionManagement.load()]);
  }

  return {
    accounts: linked.accounts,
    providers: linked.providers,
    hasPassword: linked.hasPassword,
    sessions: sessionManagement.sessions,
    loading,
    loadError,
    action: feedback.action,
    actionError: feedback.actionError,
    successMessage: feedback.successMessage,
    deleting: deletion.deleting,
    clearActionError: feedback.clearActionError,
    load,
    linkAccount: linked.linkAccount,
    unlinkAccount: linked.unlinkAccount,
    revokeSession: sessionManagement.revokeSession,
    revokeOtherSessions: sessionManagement.revokeOtherSessions,
    deleteAccount: deletion.deleteAccount,
  };
}
