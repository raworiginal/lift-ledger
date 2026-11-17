import type { ChangePasswordFormData } from "#shared/auth/types/auth";

export function useChangePassword() {
  const action = useAuthClientAction((client) => client.changePassword);
  const successMessage = ref<string | null>(null);
  const loading = computed(() => action.status.value === "pending");
  const error = computed(() => action.error.value?.message ?? null);

  async function submit(input: ChangePasswordFormData) {
    successMessage.value = null;

    await action.execute({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    if (action.status.value !== "success") return;

    successMessage.value = "Password changed successfully.";
  }

  return { loading, error, successMessage, submit };
}
