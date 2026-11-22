import { getErrorMessage } from "#layers/auth/app/utils/error";

export function useAccountFeedback() {
  const action = ref(false);
  const actionError = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  function clearActionError() {
    actionError.value = null;
  }

  function showSuccess(message: string) {
    successMessage.value = message;
  }

  function showError(error: unknown) {
    actionError.value = getErrorMessage(error);
  }

  async function runAction(task: () => Promise<void>) {
    action.value = true;
    clearActionError();
    successMessage.value = null;
    try {
      await task();
    } catch (error) {
      showError(error);
    } finally {
      action.value = false;
    }
  }

  return {
    action: readonly(action),
    actionError: readonly(actionError),
    successMessage: readonly(successMessage),
    clearActionError,
    showSuccess,
    showError,
    runAction,
  };
}
