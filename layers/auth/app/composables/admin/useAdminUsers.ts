import type {
  ListAdminUserProvidersResult,
  ListUsersOptions,
  ListUsersResult,
} from "#shared/auth/types/admin";

export async function useAdminUsers(options: ComputedRef<ListUsersOptions>) {
  const { data, pending, error, refresh } = await useAuthAsyncData(
    "admin-users",
    async (requestFetch) => {
      const params = new URLSearchParams();
      const { limit, offset, searchValue, searchField, searchOperator } =
        options.value;

      if (limit !== undefined) params.set("limit", String(limit));
      if (offset !== undefined) params.set("offset", String(offset));
      if (searchValue) params.set("searchValue", searchValue);
      if (searchField) params.set("searchField", searchField);
      if (searchOperator) params.set("searchOperator", searchOperator);

      const result = await requestFetch<ListUsersResult>(
        `/api/auth/admin/list-users?${params.toString()}`,
      );
      if (result.users.length === 0) return result;

      const { providersByUserId } =
        await requestFetch<ListAdminUserProvidersResult>(
          "/api/admin/user-providers",
          {
            method: "POST",
            body: { userIds: result.users.map((user) => user.id) },
          },
        );

      return {
        ...result,
        users: result.users.map((user) => ({
          ...user,
          providers: providersByUserId[user.id] ?? [],
        })),
      };
    },
    { watch: [options] },
  );

  return {
    users: computed(() => data.value?.users ?? []),
    total: computed(() => data.value?.total ?? 0),
    loading: pending,
    error: computed(() => error.value?.message ?? null),
    refresh,
  };
}
