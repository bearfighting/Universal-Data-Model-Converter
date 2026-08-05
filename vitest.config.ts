import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@schema-transformation-toolkit/core": "/packages/core/src/index.ts",
      "@schema-transformation-toolkit/generator-json-schema":
        "/packages/generators/json-schema/src/index.ts",
      "@schema-transformation-toolkit/generator-openapi":
        "/packages/generators/openapi/src/index.ts",
      "@schema-transformation-toolkit/generator-typescript":
        "/packages/generators/typescript/src/index.ts",
      "@schema-transformation-toolkit/generator-zod":
        "/packages/generators/zod/src/index.ts",
      "@schema-transformation-toolkit/parser-json":
        "/packages/parsers/json/src/index.ts",
      "@schema-transformation-toolkit/parser-json-schema":
        "/packages/parsers/json-schema/src/index.ts",
      "@schema-transformation-toolkit/parser-typescript":
        "/packages/parsers/typescript/src/index.ts",
      "@schema-transformation-toolkit/parser-openapi":
        "/packages/parsers/openapi/src/index.ts",
      "@schema-transformation-toolkit/parser-zod":
        "/packages/parsers/zod/src/index.ts",
      "@schema-transformation-toolkit/sdk": "/packages/sdk/src/index.ts",
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
});
