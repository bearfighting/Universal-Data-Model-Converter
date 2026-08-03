import { describe, expect, it } from "vitest";
import {
  convert,
  listTargetFormatSupports,
  publicConvertResultSchema,
} from "../../packages/sdk/src/index.js";

const openApiInput = JSON.stringify({
  openapi: "3.1.0",
  components: {
    schemas: {
      User: {
        type: "object",
        properties: { id: { type: "string", minLength: 1 } },
        required: ["id"],
      },
    },
  },
});

describe("SDK OpenAPI target", () => {
  it("exposes OpenAPI as a target and converts OpenAPI to canonical OpenAPI", () => {
    expect(
      listTargetFormatSupports().map((summary) => summary.format),
    ).toContain("openapi");

    const result = convert({
      sourceFormat: "openapi",
      targetFormat: "openapi",
      input: openApiInput,
      name: "User",
      includeArtifacts: true,
      advanced: {
        parser: { openapi: { entry: "User" } },
      },
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result).toMatchObject({
      ok: true,
      output: {
        openapi: "3.1.0",
        components: { schemas: expect.any(Object) },
      },
      artifacts: {
        shape: expect.any(Object),
        constraints: expect.any(Object),
      },
    });
  });

  it("supports JSON Schema and TypeScript sources targeting OpenAPI", () => {
    const jsonSchemaResult = convert({
      sourceFormat: "json-schema",
      targetFormat: "openapi",
      input: JSON.stringify({
        title: "User",
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      }),
      name: "User",
    });
    const typeScriptResult = convert({
      sourceFormat: "typescript",
      targetFormat: "openapi",
      input: "export type User = { id: string };",
      name: "User",
    });

    expect(jsonSchemaResult.ok).toBe(true);
    expect(typeScriptResult.ok).toBe(true);
    if (jsonSchemaResult.ok)
      expect(jsonSchemaResult.output).toMatchObject({ openapi: "3.1.0" });
    if (typeScriptResult.ok)
      expect(typeScriptResult.output).toMatchObject({ openapi: "3.1.0" });
  });
});
