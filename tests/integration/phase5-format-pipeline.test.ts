import { describe, expect, it } from "vitest";
import { convert } from "../../packages/sdk/src/index.js";

const cases = [
  {
    id: "json",
    sourceFormat: "json",
    targetFormat: "json",
    input: '{"id":1}',
  },
  {
    id: "yaml",
    sourceFormat: "yaml",
    targetFormat: "yaml",
    input: "id: 1\n",
  },
  {
    id: "csv",
    sourceFormat: "csv",
    targetFormat: "json",
    input: "id\n1\n",
  },
  {
    id: "toml",
    sourceFormat: "toml",
    targetFormat: "json",
    input: "id = 1\n",
  },
  {
    id: "json-schema",
    sourceFormat: "json-schema",
    targetFormat: "json-schema",
    input: '{"type":"object","properties":{"id":{"type":"string"}}}',
  },
  {
    id: "typescript",
    sourceFormat: "typescript",
    targetFormat: "typescript",
    input: "export type User = { id: string };",
  },
  {
    id: "zod",
    sourceFormat: "zod",
    targetFormat: "zod",
    input: [
      'import { z } from "zod";',
      "export const UserSchema = z.object({ id: z.string() });",
    ].join("\n"),
  },
  {
    id: "openapi",
    sourceFormat: "openapi",
    targetFormat: "openapi",
    input: JSON.stringify({
      openapi: "3.1.0",
      info: { title: "Users", version: "1.0.0" },
      components: {
        schemas: {
          User: {
            type: "object",
            properties: { id: { type: "string" } },
          },
        },
      },
    }),
  },
] as const;

describe("Phase 5 format pipeline matrix", () => {
  it.each(cases)(
    "executes $id through the generic SDK pipeline",
    (testCase) => {
      const result = convert({
        sourceFormat: testCase.sourceFormat,
        targetFormat: testCase.targetFormat,
        input: testCase.input,
        name: `${testCase.id}-pipeline-document`,
        includeArtifacts: true,
        ...(testCase.id === "openapi"
          ? { advanced: { parser: { openapi: { entry: "User" } } } }
          : {}),
      });

      expect(result).toMatchObject({
        ok: true,
        plan: {
          sourceFormat: testCase.sourceFormat,
          targetFormat: testCase.targetFormat,
        },
      });
    },
  );

  it("preserves the expected artifact lanes for value, shape, and constraint routes", () => {
    const valueResult = convert({
      sourceFormat: "json",
      targetFormat: "json",
      input: '{"id":1}',
      includeArtifacts: true,
    });
    const shapeResult = convert({
      sourceFormat: "json",
      targetFormat: "typescript",
      input: '{"id":1}',
      includeArtifacts: true,
    });
    const constraintResult = convert({
      sourceFormat: "json-schema",
      targetFormat: "json-schema",
      input: '{"type":"string","minLength":1}',
      includeArtifacts: true,
    });

    expect(valueResult).toMatchObject({
      ok: true,
      artifacts: { value: { kind: "value-document" } },
    });
    expect(shapeResult).toMatchObject({
      ok: true,
      artifacts: {
        value: { kind: "value-document" },
        shape: { kind: "document" },
      },
    });
    expect(constraintResult).toMatchObject({
      ok: true,
      artifacts: {
        shape: { kind: "document" },
        constraints: { kind: "constraint-document" },
      },
    });
  });
});
