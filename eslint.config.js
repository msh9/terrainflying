import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "test-results/**", ".playwright-browsers/**"]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "no-console": "off"
    }
  }
];
