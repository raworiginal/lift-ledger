export default defineNuxtConfig({
  extends: ["./layers/auth"],
  modules: ["@nuxthub/core", "@nuxtjs/better-auth", "@nuxt/ui", "@nuxt/eslint"],
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
  nitro: {
    serverAssets: [
      { baseName: "migrations", dir: "./server/db/migrations/postgresql" },
      { baseName: "seed", dir: "./data/seed" },
      { baseName: "muscle-images", dir: "./public/images/muscles" },
    ],
  },
  css: ["~~/app/assets/css/main.css"],
});
