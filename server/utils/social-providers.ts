import type { SocialProvider } from "#shared/auth/types/auth";

type SocialProviderRuntimeConfig = {
  googleClientId?: unknown;
  googleClientSecret?: unknown;
  githubClientId?: unknown;
  githubClientSecret?: unknown;
};

type SocialProviderCredentials = {
  clientId: string;
  clientSecret: string;
};

export type ConfiguredSocialProviders = Partial<
  Record<SocialProvider, SocialProviderCredentials>
>;

export function getConfiguredSocialProviders(
  runtimeConfig: SocialProviderRuntimeConfig,
): ConfiguredSocialProviders {
  const providers: ConfiguredSocialProviders = {};

  for (const provider of ["google", "github"] as const) {
    const clientId = runtimeConfig[`${provider}ClientId`];
    const clientSecret = runtimeConfig[`${provider}ClientSecret`];
    const hasClientId = typeof clientId === "string" && clientId.length > 0;
    const hasClientSecret =
      typeof clientSecret === "string" && clientSecret.length > 0;

    if (!hasClientId && !hasClientSecret) {
      continue;
    }

    if (!hasClientId || !hasClientSecret) {
      const providerName = provider.toUpperCase();
      throw new Error(
        `Both NUXT_${providerName}_CLIENT_ID and NUXT_${providerName}_CLIENT_SECRET must be configured to enable ${provider} sign-in.`,
      );
    }

    providers[provider] = {
      clientId,
      clientSecret,
    };
  }

  return providers;
}

export function getConfiguredSocialProviderIds(
  runtimeConfig: SocialProviderRuntimeConfig,
): SocialProvider[] {
  return Object.keys(
    getConfiguredSocialProviders(runtimeConfig),
  ) as SocialProvider[];
}
