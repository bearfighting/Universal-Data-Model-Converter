import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@schema-transformation-toolkit/core/internal":
        "/packages/core/src/internal.ts",
      "@schema-transformation-toolkit/core": "/packages/core/src/index.ts",
      "@schema-transformation-toolkit/generator-json-schema":
        "/packages/generators/json-schema/src/index.ts",
      "@schema-transformation-toolkit/generator-json":
        "/packages/generators/json/src/index.ts",
      "@schema-transformation-toolkit/generator-csv":
        "/packages/generators/csv/src/index.ts",
      "@schema-transformation-toolkit/generator-toml":
        "/packages/generators/toml/src/index.ts",
      "@schema-transformation-toolkit/generator-openapi":
        "/packages/generators/openapi/src/index.ts",
      "@schema-transformation-toolkit/generator-typescript":
        "/packages/generators/typescript/src/index.ts",
      "@schema-transformation-toolkit/generator-yaml":
        "/packages/generators/yaml/src/index.ts",
      "@schema-transformation-toolkit/generator-zod":
        "/packages/generators/zod/src/index.ts",
      "@schema-transformation-toolkit/generator-rust":
        "/packages/generators/rust/src/index.ts",
      "@schema-transformation-toolkit/parser-json":
        "/packages/parsers/json/src/index.ts",
      "@schema-transformation-toolkit/parser-csv":
        "/packages/parsers/csv/src/index.ts",
      "@schema-transformation-toolkit/parser-toml":
        "/packages/parsers/toml/src/index.ts",
      "@schema-transformation-toolkit/parser-json-schema":
        "/packages/parsers/json-schema/src/index.ts",
      "@schema-transformation-toolkit/parser-typescript":
        "/packages/parsers/typescript/src/index.ts",
      "@schema-transformation-toolkit/parser-openapi":
        "/packages/parsers/openapi/src/index.ts",
      "@schema-transformation-toolkit/parser-zod":
        "/packages/parsers/zod/src/index.ts",
      "@schema-transformation-toolkit/parser-yaml":
        "/packages/parsers/yaml/src/index.ts",
      "@schema-transformation-toolkit/parser-rust":
        "/packages/parsers/rust/src/index.ts",
      "@schema-transformation-toolkit/sdk": "/packages/sdk/src/index.ts",
    },
  },
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "tests/**/*.test.ts",
      "tests/**/*.test.mjs",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
});
