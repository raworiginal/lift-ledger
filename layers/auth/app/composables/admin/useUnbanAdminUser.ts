import { getErrorMessage } from "#layers/auth/app/utils/error";
import type { UnbanAdminUserInput } from "#shared/auth/types/admin";

export function useUnbanAdminUser() {
  const action = useAuthClientAction((client) => client.admin.unbanUser);
  const successMessage = ref<string | null>(null);
  const showActionError = ref(false);
  const loading = computed(() => action.status.value === "pending");
  const error = computed(() =>
    showActionError.value &&
    action.status.value === "error" &&
    action.error.value
      ? getErrorMessage(action.error.value)
      : null,
  );

  function clearState() {
    successMessage.value = null;
    showActionError.value = false;
  }

  async function submit(input: UnbanAdminUserInput) {
    clearState();

    await action.execute({ userId: input.userId });
    showActionError.value = true;
    if (action.status.value === "success") {
      successMessage.value = "User unbanned successfully.";
    }
  }

  return {
    loading,
    error,
    successMessage,
    clearState,
    submit,
  };
}
