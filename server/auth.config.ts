import { defineServerAuth } from "@nuxtjs/better-auth/config";
import { admin, username } from "better-auth/plugins";
export default defineServerAuth((_ctx) => ({
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      weightUnit: { type: "string", defaultValue: "lb", input: true },
    },
  },
  plugins: [admin(), username()],
}));
