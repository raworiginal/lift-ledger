import type { useAccountFeedback } from "./useAccountFeedback";

type DeleteUserClient = {
  deleteUser: (input?: { password?: string }) => Promise<{
    error?: { message?: string } | null;
  }>;
};

export function useAccountDeletion(
  feedback: ReturnType<typeof useAccountFeedback>,
) {
  const deleting = ref(false);

  async function deleteAccount(password?: string) {
    deleting.value = true;
    feedback.clearActionError();
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
      feedback.showError(error);
    } finally {
      deleting.value = false;
    }
  }

  return {
    deleting: readonly(deleting),
    deleteAccount,
  };
}
