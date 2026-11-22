const authSchemaUrl = new URL(
  "../../.nuxt/better-auth/schema.postgresql.mjs",
  import.meta.url,
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "#auth/schema") {
    return { url: authSchemaUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
