import {
  DEFAULT_ADMIN_USERS_PAGE_SIZE,
  MAX_ADMIN_USERS_PAGE_SIZE,
} from "#layers/auth/app/utils/admin";
import type {
  ListUsersOptions,
  ListUsersSearchOptions,
} from "#shared/auth/types/admin";

function parseQueryNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function useAdminUsersQuery() {
  const route = useRoute();
  const router = useRouter();

  const options = computed<ListUsersOptions>(() => ({
    limit: Math.max(
      1,
      Math.min(
        parseQueryNumber(route.query.limit, DEFAULT_ADMIN_USERS_PAGE_SIZE),
        MAX_ADMIN_USERS_PAGE_SIZE,
      ),
    ),
    offset: parseQueryNumber(route.query.offset, 0),
    searchValue:
      typeof route.query.searchValue === "string"
        ? route.query.searchValue
        : undefined,
    searchField:
      route.query.searchField === "email" || route.query.searchField === "name"
        ? route.query.searchField
        : "name",
    searchOperator: "contains",
  }));

  async function updateOptions(next: Partial<ListUsersOptions>) {
    const query = { ...route.query };

    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") {
        delete query[key];
      } else {
        query[key] = String(value);
      }
    }

    await router.replace({ query });
  }

  async function handleSearch(search: ListUsersSearchOptions) {
    await updateOptions({
      ...search,
      offset: 0,
    });
  }

  return {
    options,
    updateOptions,
    handleSearch,
  };
}
