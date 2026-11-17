import { defineServerAuth } from "@nuxtjs/better-auth/config";
import { admin } from "better-auth/plugins";
import { getConfiguredSocialProviders } from "./utils/social-providers";

export default defineServerAuth(({ runtimeConfig }) => {
  const socialProviders = getConfiguredSocialProviders(runtimeConfig);
  const authMode = runtimeConfig.public.authMode;
  if (authMode !== "email-password" && authMode !== "social-only") {
    throw new Error(
      'NUXT_PUBLIC_AUTH_MODE must be either "email-password" or "social-only".',
    );
  }

  if (authMode === "social-only" && Object.keys(socialProviders).length === 0) {
    throw new Error(
      "Social-only authentication requires at least one configured social provider.",
    );
  }

  return {
    emailAndPassword: { enabled: authMode === "email-password" },
    rateLimit: { enabled: true, storage: "database" },
    // Keep deletion protected by password/fresh-session checks; do not send email.
    user: { deleteUser: { enabled: true } },
    ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
    plugins: [admin()],
  };
});
