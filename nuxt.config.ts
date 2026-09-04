// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  runtimeConfig: {
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    adminName: process.env.ADMIN_NAME,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
    },
  },
  devtools: { enabled: true },
  modules: ["@nuxtjs/better-auth", "@nuxthub/core"],
  vite: {
    plugins: [tailwindcss()],
  },
  css: ["~/assets/css/main.css"],
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
    "/app/**": { auth: { only: "user", redirectTo: "/" } },
    "/admin/**": { auth: { only: "user", redirectTo: "/" } },
    "/login": { auth: { only: "guest", redirectTo: "/app" } },
  },
  hub: {
    db: "sqlite",
  },
});
