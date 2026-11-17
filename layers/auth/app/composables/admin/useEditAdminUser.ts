import { getErrorMessage } from "#layers/auth/app/utils/error";
import type { EditAdminUserInput } from "#shared/auth/types/admin";

export function useEditAdminUser() {
  const action = useAuthClientAction((client) => client.admin.updateUser);
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

  async function submit(input: EditAdminUserInput) {
    clearState();

    await action.execute({
      userId: input.userId,
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
      },
    });

    showActionError.value = true;

    if (action.status.value === "success") {
      successMessage.value = "User updated successfully.";
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
