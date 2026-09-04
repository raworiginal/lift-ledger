import { bootstrapAdmin } from "../admin/bootstrap";

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();
  const env = {
    ADMIN_EMAIL: config.adminEmail || process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: config.adminPassword || process.env.ADMIN_PASSWORD,
    ADMIN_NAME: config.adminName || process.env.ADMIN_NAME,
  };

  try {
    for (let attempt = 0; ; attempt += 1) {
      try {
        await bootstrapAdmin(serverAuth(), env);
        break;
      } catch (cause) {
        if (attempt >= 20 || !String(cause).includes("no such column")) throw cause;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  } catch (cause) {
    console.error("[admin-bootstrap] Failed to provision the configured administrator", cause);
    throw cause;
  }
});
