import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";

const layerRoot = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  $meta: {
    name: "auth",
  },
  srcDir: join(layerRoot, "app"),
  auth: {
    schema: { casing: "snake_case" },
    redirects: {
      login: "/login",
      guest: "/app",
      authenticated: "/app",
      logout: "/login",
      sessionExpired: "/login",
    },
  },
  routeRules: {
    "/app/**": { auth: "user" },
    "/admin/**": {
      auth: { only: "user", user: { role: "admin" }, redirectTo: "/app" },
    },
    "/login": { auth: "guest" },
    "/register": { auth: "guest" },
  },
  imports: {
    dirs: [
      join(layerRoot, "app/composables/auth"),
      join(layerRoot, "app/composables/admin"),
      join(layerRoot, "app/utils"),
    ],
  },
  components: [
    {
      path: join(layerRoot, "app/components"),
      pathPrefix: false,
    },
  ],
});
