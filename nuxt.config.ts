// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/better-auth", "@nuxthub/core"],
  vite: {
    plugins: [tailwindcss()],
  },
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
