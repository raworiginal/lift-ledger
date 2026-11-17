import { getErrorMessage } from "#layers/auth/app/utils/error";
import type { CreateAdminUserFormData } from "#shared/auth/types/admin";

export function useCreateAdminUser() {
  const action = useAuthClientAction((client) => client.admin.createUser);
  const successMessage = ref<string | null>(null);
  const loading = computed(() => action.status.value === "pending");
  const error = computed(() =>
    action.error.value ? getErrorMessage(action.error.value) : null,
  );

  async function submit(input: CreateAdminUserFormData) {
    successMessage.value = null;

    await action.execute({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
    });

    if (action.status.value === "success") {
      successMessage.value = "User created successfully.";
    }
  }

  return { loading, error, successMessage, submit };
}
