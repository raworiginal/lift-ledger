export default defineNuxtConfig({
  extends: ["./layers/auth"],
  modules: ["@nuxthub/core", "@nuxtjs/better-auth", "@nuxt/ui"],
  srcDir: "app/",
  dir: { shared: "layers/auth/shared" },
  components: [{ path: "~/components", pathPrefix: false }],
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  hub: {
    db: {
      dialect: "postgresql",
      driver: "postgres-js",
      applyMigrationsDuringBuild: false,
      applyMigrationsDuringDev: false,
    },
  },
  runtimeConfig: {
    googleClientId: "",
    googleClientSecret: "",
    githubClientId: "",
    githubClientSecret: "",
    public: {
      authMode: "email-password",
    },
  },
  css: ["~~/app/assets/css/main.css"],
});
