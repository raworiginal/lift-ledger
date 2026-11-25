export function readSiteUrl(env: NodeJS.ProcessEnv): string {
  const value = env.NUXT_PUBLIC_SITE_URL?.trim();
  if (!value) {
    throw new Error(
      "NUXT_PUBLIC_SITE_URL is not set. Set it to the public URL of the app, such as http://localhost:3000 or https://your-domain.",
    );
  }

  let protocol: string;
  try {
    protocol = new URL(value).protocol;
  } catch {
    throw new Error(
      `NUXT_PUBLIC_SITE_URL must be a valid URL, got "${value}".`,
    );
  }
  if (protocol !== "http:" && protocol !== "https:") {
    throw new Error(
      "NUXT_PUBLIC_SITE_URL must start with http:// or https://.",
    );
  }

  return value;
}
