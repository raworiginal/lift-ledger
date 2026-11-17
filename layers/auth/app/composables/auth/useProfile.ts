import type { ProfileFormData } from "#shared/auth/types/auth";

export function useProfile() {
  const action = useAuthClientAction((client) => client.updateUser);
  const successMessage = ref<string | null>(null);
  const loading = computed(() => action.status.value === "pending");
  const error = computed(() => action.error.value?.message ?? null);

  async function submit(input: ProfileFormData) {
    successMessage.value = null;

    await action.execute({
      name: input.name,
      image: input.image || null,
    });

    if (action.status.value === "success") {
      successMessage.value = "Profile updated successfully.";
    }
  }

  return { loading, error, successMessage, submit };
}
