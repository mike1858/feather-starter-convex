import reactRefresh from "eslint-plugin-react-refresh";
import reactHooks from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "convex/_generated/"] },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  reactHooks.configs.flat["recommended-latest"],
  {
    languageOptions: {
      globals: { browser: true, es2020: true },
    },
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
  // Disable react-refresh warnings for route files (TanStack Router exports both Route and component)
  {
    files: ["src/routes/**/*.tsx", "src/routes/**/*.ts"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // Relax strict rules for test and setup files
  {
    files: [
      "convex/test.setup.ts",
      "src/test-setup.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  // Server-rendered email templates are not client React components
  {
    files: ["convex/otp/**/*.tsx", "convex/email/**/*.tsx"],
    rules: {
      "react-hooks/purity": "off",
    },
  },
  eslintConfigPrettier,
);
