import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".cursor/**",
    "graphify-out/**",
    "next-env.d.ts",
    // The Expo app has its own toolchain and TypeScript version; linting React
    // Native sources with the Next.js config produces only false positives.
    "mobile/**",
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      // A leading underscore marks a binding that is kept deliberately, such as a
      // prop destructured to document the component's API before it is consumed.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);

export default eslintConfig;
