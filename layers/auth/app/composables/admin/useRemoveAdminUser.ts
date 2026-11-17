import { getErrorMessage } from "#layers/auth/app/utils/error";
import {
  removeAdminUserResultSchema,
  selectedAdminUserIdSchema,
} from "#shared/auth/schemas/admin";
import type { RemoveAdminUserInput } from "#shared/auth/types/admin";

export function useRemoveAdminUser() {
  const requestFetch = useAuthRequestFetch();
  const action = useAction(async (body: RemoveAdminUserInput) => ({
    response: await requestFetch("/api/admin/remove-user", {
      method: "POST",
      body,
    }),
  }));
  const fieldErrors = ref<Record<string, string>>({});
  const error = ref<string | null>(null);
  const successMessage = ref<string | null>(null);
  const loading = computed(() => action.status.value === "pending");

  function clearState() {
    fieldErrors.value = {};
    error.value = null;
    successMessage.value = null;
  }

  async function remove(input: RemoveAdminUserInput) {
    clearState();

    const parsed = selectedAdminUserIdSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !fieldErrors.value[field]) {
          fieldErrors.value[field] = issue.message;
        }
      }
      return false;
    }

    await action.execute(parsed.data);
    if (action.status.value === "error") {
      const caughtError = action.error.value?.raw;
      const statusCode = action.error.value?.status;
      if (statusCode === 401) {
        error.value = "Your session has expired. Please sign in again.";
      } else if (statusCode === 403) {
        error.value = "You are not authorized to remove users.";
      } else if (statusCode === 404) {
        error.value = "The selected user was not found.";
      } else if (statusCode === 400) {
        const message = getErrorMessage(caughtError);
        error.value = message.toLowerCase().includes("cannot remove yourself")
          ? "You cannot remove yourself."
          : "This user cannot be removed. Please select another user.";
      } else if (statusCode && statusCode >= 500) {
        error.value = "The server could not remove the user.";
      } else {
        error.value = getErrorMessage(caughtError);
      }
      return false;
    }

    const response = removeAdminUserResultSchema.safeParse(
      action.data.value?.response,
    );
    if (!response.success || !response.data.success) {
      error.value = "The server returned an invalid removal response.";
      return false;
    }

    successMessage.value = "User removed successfully.";
    return true;
  }

  return { fieldErrors, error, successMessage, loading, clearState, remove };
}
