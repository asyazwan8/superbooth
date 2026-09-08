import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next ships flat configs directly, so these are spread as-is
// rather than being adapted through FlatCompat.
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      ".superbooth-mock/**",
    ],
  },
];

export default eslintConfig;
