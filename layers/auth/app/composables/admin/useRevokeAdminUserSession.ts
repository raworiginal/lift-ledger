import { getErrorMessage } from "#layers/auth/app/utils/error";
import {
  revokeAdminUserSessionResultSchema,
  selectedAdminUserSessionIdSchema,
} from "#shared/auth/schemas/admin";
import type { RevokeAdminUserSessionInput } from "#shared/auth/types/admin";

export function useRevokeAdminUserSession() {
  const requestFetch = useAuthRequestFetch();
  const action = useAction(async (body: RevokeAdminUserSessionInput) => ({
    response: await requestFetch("/api/admin/revoke-user-session", {
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

  async function revoke(input: RevokeAdminUserSessionInput) {
    clearState();
    const parsed = selectedAdminUserSessionIdSchema.safeParse(input);
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
        error.value = "You are not authorized to revoke sessions.";
      } else if (statusCode === 404) {
        error.value = "The selected session was not found.";
      } else if (statusCode === 400) {
        error.value = "Please select a valid session.";
      } else if (statusCode && statusCode >= 500) {
        error.value = "The server could not revoke the session.";
      } else {
        error.value = getErrorMessage(caughtError);
      }
      return false;
    }

    const response = revokeAdminUserSessionResultSchema.safeParse(
      action.data.value?.response,
    );
    if (!response.success || !response.data.success) {
      error.value = "The server returned an invalid revocation response.";
      return false;
    }

    successMessage.value = "Session revoked successfully.";
    return true;
  }

  return { fieldErrors, error, successMessage, loading, clearState, revoke };
}
