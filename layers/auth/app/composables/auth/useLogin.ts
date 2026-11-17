import type { LoginFormData } from "#shared/auth/types/auth";

export function useLogin() {
  const action = useSignIn("email");
  const loading = computed(() => action.status.value === "pending");
  const error = computed(() => action.error.value?.message ?? null);

  async function submit(input: LoginFormData) {
    await action.execute(input);
  }

  return { loading, error, submit };
}
