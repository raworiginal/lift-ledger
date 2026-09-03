// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/better-auth", "@nuxthub/core"],
  auth: {
    redirects: {
      login: "/login",
      guest: "/",
      authenticated: "/app",
      logout: "/",
    },
    preserveRedirect: true,
  },
  routeRules: {
    "/app/**": { auth: { only: "user", redirectTo: "/login" } },
    "/login": { auth: { only: "guest", redirectTo: "/app" } },
  },
  hub: {
    db: "sqlite",
  },
});
