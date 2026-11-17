import { getErrorMessage } from "#layers/auth/app/utils/error";
import type { ResetAdminUserPasswordInput } from "#shared/auth/types/admin";

export function useResetAdminUserPassword() {
  const action = useAuthClientAction((client) => client.admin.setUserPassword);
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

  async function submit(input: ResetAdminUserPasswordInput) {
    clearState();

    await action.execute({
      userId: input.userId,
      newPassword: input.newPassword,
    });

    showActionError.value = true;

    if (action.status.value !== "success") return;

    successMessage.value = "Password reset successfully.";
  }

  return {
    loading,
    error,
    successMessage,
    clearState,
    submit,
  };
}
