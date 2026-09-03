import { defineServerAuth } from "@nuxtjs/better-auth/config";

export default defineServerAuth((_ctx) => ({
  emailAndPassword: { enabled: true },
}));
