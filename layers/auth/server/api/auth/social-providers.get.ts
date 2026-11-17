import { getConfiguredSocialProviderIds } from "#server/utils/social-providers";

export default defineEventHandler((event) => {
  return getConfiguredSocialProviderIds(useRuntimeConfig(event as never));
});
