import { getErrorMessage } from "#layers/auth/app/utils/error";
import type { BanAdminUserInput } from "#shared/auth/types/admin";

const durationMultipliers = {
  seconds: 1,
  minutes: 60,
  hours: 60 * 60,
  days: 24 * 60 * 60,
} as const;

export function useBanAdminUser() {
  const action = useAuthClientAction((client) => client.admin.banUser);
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

  async function submit(input: BanAdminUserInput) {
    clearState();

    const { userId, banReason, duration, durationUnit } = input;
    await action.execute({
      userId,
      ...(banReason ? { banReason } : {}),
      ...(duration !== undefined
        ? { banExpiresIn: duration * durationMultipliers[durationUnit] }
        : {}),
    });

    showActionError.value = true;
    if (action.status.value === "success") {
      successMessage.value = "User banned successfully.";
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
