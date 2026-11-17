import { getErrorMessage } from "#layers/auth/app/utils/error";
import {
  listAdminUserSessionsResultSchema,
  listAdminUserSessionsSchema,
} from "#shared/auth/schemas/admin";
import type {
  AdminUserSession,
  ListAdminUserSessionsInput,
} from "#shared/auth/types/admin";

export function useAdminUserSessions() {
  const sessions = ref<AdminUserSession[]>([]);
  const requestFetch = useAuthRequestFetch();
  const action = useAction(async (body: ListAdminUserSessionsInput) => ({
    response: await requestFetch("/api/admin/user-sessions", {
      method: "POST",
      body,
    }),
  }));
  const fieldErrors = ref<Record<string, string>>({});
  const error = ref<string | null>(null);
  const successMessage = ref<string | null>(null);
  const loading = computed(() => action.status.value === "pending");
  let latestLoadId = 0;

  function clearState() {
    latestLoadId += 1;
    sessions.value = [];
    fieldErrors.value = {};
    error.value = null;
    successMessage.value = null;
  }

  async function load(input: ListAdminUserSessionsInput) {
    clearState();
    const loadId = latestLoadId;

    const inputResult = listAdminUserSessionsSchema.safeParse(input);
    if (!inputResult.success) {
      for (const issue of inputResult.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !fieldErrors.value[field]) {
          fieldErrors.value[field] = issue.message;
        }
      }
      return;
    }

    await action.execute(inputResult.data);
    // A newer selection or a closed dialog invalidates this response.
    if (loadId !== latestLoadId) return;

    if (action.status.value === "error") {
      const caughtError = action.error.value?.raw;
      const statusCode = action.error.value?.status;
      if (statusCode === 401) {
        error.value = "Your session has expired. Please sign in again.";
      } else if (statusCode === 403) {
        error.value = "You are not authorized to view user sessions.";
      } else if (statusCode && statusCode >= 500) {
        error.value = "The server could not load user sessions.";
      } else {
        error.value = getErrorMessage(caughtError);
      }
      return;
    }

    const parsed = listAdminUserSessionsResultSchema.safeParse(
      action.data.value?.response,
    );
    if (!parsed.success) {
      error.value = "The server returned an invalid sessions response.";
      return;
    }

    sessions.value = parsed.data.sessions;
    successMessage.value = "Sessions loaded successfully.";
  }

  return {
    sessions,
    fieldErrors,
    error,
    successMessage,
    loading,
    clearState,
    load,
  };
}
