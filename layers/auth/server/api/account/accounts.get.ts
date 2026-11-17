import { enforceCustomApiRateLimit } from "#server/utils/custom-api-rate-limit";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  const { user } = await requireUserSession(event);
  await enforceCustomApiRateLimit(event, user.id, "account");

  const headers = new Headers();
  for (const [name, value] of Object.entries(getRequestHeaders(event))) {
    if (value) headers.set(name, value);
  }
  const auth = serverAuth();
  const accounts = await auth.api.listUserAccounts({
    headers,
  });

  return {
    accounts: accounts.map((account) => ({
      id: account.id,
      providerId: account.providerId,
      accountId: account.accountId,
    })),
  };
});
