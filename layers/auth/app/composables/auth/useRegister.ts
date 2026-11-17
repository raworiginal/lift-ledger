import type { RegisterFormData } from "#shared/auth/types/auth";

export function useRegister() {
  const action = useSignUp("email");
  const loading = computed(() => action.status.value === "pending");
  const error = computed(() => action.error.value?.message ?? null);

  async function submit(input: RegisterFormData) {
    await action.execute({
      email: input.email,
      name: input.name,
      password: input.password,
    });
  }

  return { loading, error, submit };
}
