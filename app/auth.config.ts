import { defineClientAuth } from "@nuxtjs/better-auth/config";
import { adminClient, usernameClient } from "better-auth/client/plugins";

export default defineClientAuth({
  plugins: [adminClient(), usernameClient()],
});
