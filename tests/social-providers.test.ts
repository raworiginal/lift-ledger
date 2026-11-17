import assert from "node:assert/strict";
import test from "node:test";
import {
  getConfiguredSocialProviderIds,
  getConfiguredSocialProviders,
} from "../server/utils/social-providers";

test("no social providers are enabled when credentials are absent", () => {
  assert.deepEqual(getConfiguredSocialProviders({}), {});
  assert.deepEqual(getConfiguredSocialProviderIds({}), []);
});

test("only complete social provider credentials are returned", () => {
  const config = {
    googleClientId: "google-id",
    googleClientSecret: "google-secret",
    githubClientId: "github-id",
    githubClientSecret: "github-secret",
  };

  assert.deepEqual(getConfiguredSocialProviders(config), {
    google: { clientId: "google-id", clientSecret: "google-secret" },
    github: { clientId: "github-id", clientSecret: "github-secret" },
  });
  assert.deepEqual(getConfiguredSocialProviderIds(config), [
    "google",
    "github",
  ]);
});

test("partial social credentials fail with the missing configuration guidance", () => {
  assert.throws(
    () => getConfiguredSocialProviders({ googleClientId: "google-id" }),
    /Both NUXT_GOOGLE_CLIENT_ID and NUXT_GOOGLE_CLIENT_SECRET must be configured/,
  );
  assert.throws(
    () => getConfiguredSocialProviders({ githubClientSecret: "github-secret" }),
    /Both NUXT_GITHUB_CLIENT_ID and NUXT_GITHUB_CLIENT_SECRET must be configured/,
  );
});

test("empty or non-string credentials do not enable a provider", () => {
  assert.deepEqual(
    getConfiguredSocialProviders({
      googleClientId: "",
      googleClientSecret: "",
      githubClientId: 123,
      githubClientSecret: null,
    }),
    {},
  );
});
