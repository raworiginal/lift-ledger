import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  ignores: ["server/db/migrations/**", ".output/**", ".nuxt/**"],
  rules: {
    "vue/multi-word-component-names": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "vue/no-multiple-template-root": "off",
  },
});
