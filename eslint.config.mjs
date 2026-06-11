import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Imports mortos viram erro auto-removível (`eslint --fix`); vars/args não usados
    // continuam como aviso. caughtErrors:"none" libera `catch (e)` ocioso (idiomático)
    // e o prefixo `_` marca um binding intencionalmente não usado.
    plugins: { "unused-imports": unusedImports },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Pacote do instalador (DISTRIBUICAO): cópia do código + build standalone —
    // lintar isso duplica cada aviso e adiciona ~800 erros de código gerado.
    "dist/**",
    "release/**",
  ]),
]);

export default eslintConfig;
