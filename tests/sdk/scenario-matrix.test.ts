import { describe, expect, it } from "vitest";
import {
  collectUserFacingDiagnostics,
  convert,
  publicConvertResultSchema,
} from "../../packages/sdk/src/index.js";
import { consumerGoldenExamples } from "../../examples/fixtures/consumer-golden-examples.js";

const successExample = consumerGoldenExamples.find(
  (example) => example.id === "json-schema-feature-flags",
);
const caveatExample = consumerGoldenExamples.find(
  (example) => example.id === "json-schema-integer-widening",
);

if (!successExample || !caveatExample) {
  throw new Error(
    "Expected consumer golden examples for the sdk scenario matrix.",
  );
}

describe("sdk product scenario matrix", () => {
  it("covers a Value IR-only JSON round-trip", () => {
    const result = convert({
      sourceFormat: "json",
      targetFormat: "json",
      input: '[1,"a"]',
      name: "MixedValue",
      includeArtifacts: true,
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result).toMatchObject({
      ok: true,
      output: '[1,"a"]',
      plan: { irSequence: ["value"] },
      report: {
        irSelection: { requested: "auto", selected: "value", fallback: false },
      },
      artifacts: { value: { kind: "value-document" } },
      preservedCapabilities: ["value-ir"],
    });
  });

  it("supports explicit IR preference and rejects unavailable paths", () => {
    const shapeResult = convert({
      sourceFormat: "json",
      targetFormat: "typescript",
      input: '{"id":1}',
      irPreference: "shape",
    });
    expect(shapeResult.ok).toBe(true);
    if (shapeResult.ok) {
      expect(shapeResult.plan.irSequence).toEqual(["value", "shape"]);
    }

    const valueResult = convert({
      sourceFormat: "json",
      targetFormat: "typescript",
      input: '{"id":1}',
      irPreference: "value",
    });
    expect(valueResult).toMatchObject({
      ok: false,
      code: "unsupported-ir-preference",
    });

    const invalidShapePreference = convert({
      sourceFormat: "json",
      targetFormat: "json",
      input: '[1,"a"]',
      irPreference: "shape",
    });
    expect(invalidShapePreference).toMatchObject({
      ok: false,
      code: "unsupported-ir-preference",
    });
  });

  it("does not mask an unsupported format route as an IR preference failure", () => {
    expect(
      convert({
        sourceFormat: "missing",
        targetFormat: "json",
        input: "{}",
        irPreference: "value",
      }),
    ).toMatchObject({
      ok: false,
      code: "unsupported-route",
      phase: "parse",
      message: "Unsupported source format: missing",
    });
  });

  it("covers a stable success conversion flow", () => {
    const result = convert({
      sourceFormat: successExample.sourceFormat,
      targetFormat: successExample.targetFormat,
      input: successExample.input,
      name: successExample.title,
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.output).toContain("export type FeatureFlags");
    expect(collectUserFacingDiagnostics(result)).toEqual([]);
  });

  it("covers a successful conversion with user-facing caveats", () => {
    const result = convert({
      sourceFormat: caveatExample.sourceFormat,
      targetFormat: caveatExample.targetFormat,
      input: caveatExample.input,
      name: caveatExample.title,
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const diagnostics = collectUserFacingDiagnostics(result);

    expect(result.output).toContain("id: number");
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "integer-widened-to-number",
    );
    expect(
      diagnostics.find(
        (diagnostic) => diagnostic.code === "integer-widened-to-number",
      ),
    ).toMatchObject({
      severity: "warning",
      source: "generator-typescript",
    });
  });

  it("covers a stable typescript to typescript authoring flow", () => {
    const result = convert({
      sourceFormat: "typescript",
      targetFormat: "typescript",
      input: [
        "type InternalToken = string;",
        "export type User = { token: InternalToken };",
        "export type UserList = User[];",
      ].join("\n"),
      name: "ImplicitEntryDocument",
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.output).toContain("export type UserList = User[];");
    expect(result.report?.entrySelection).toEqual({
      mode: "implicit",
      entry: "UserList",
      strategyCode: "single-exported-root",
      source: "parser-typescript",
      path: ["entry", "UserList"],
      evidence: {
        entry: "UserList",
        selectionReason: "single-exported-root",
      },
    });
    expect(collectUserFacingDiagnostics(result)).toEqual([]);
  });

  it("covers a JSON to Zod TypeScript runtime-schema flow", () => {
    const result = convert({
      sourceFormat: "json",
      targetFormat: "zod",
      input: '{"id":1,"name":"Ada"}',
      name: "User",
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result.ok).toBe(true);

    if (!result.ok) return;

    expect(result.output).toContain('import { z } from "zod";');
    expect(result.output).toContain("export const UserSchema");
    expect(result.output).toContain("z.infer<typeof UserSchema>");
    expect(result.semanticNotes?.map((note) => note.code)).toContain(
      "zod-object-policy",
    );
  });

  it.each([
    ["json", '{"id":1}', "JsonUser"],
    [
      "json-schema",
      JSON.stringify({
        type: "object",
        properties: { id: { type: "integer" } },
      }),
      "SchemaUser",
    ],
    ["typescript", "export type User = { id: number };", "User"],
  ] as const)("supports %s to zod", (sourceFormat, input, name) => {
    const result = convert({
      sourceFormat,
      targetFormat: "zod",
      input,
      name,
      advanced: { generator: { zod: { outputLanguage: "javascript" } } },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain("export const");
    expect(result.output).not.toContain("z.infer");
  });

  it("covers a json-schema round-trip that preserves constraint semantics", () => {
    const result = convert({
      sourceFormat: "json-schema",
      targetFormat: "json-schema",
      input: JSON.stringify({
        title: "ConstrainedUser",
        type: "object",
        minProperties: 1,
        maxProperties: 8,
        properties: {
          code: {
            type: "string",
            pattern: "^[A-Z]+$",
            minLength: 2,
            maxLength: 8,
          },
          age: {
            type: "integer",
            minimum: 0,
            exclusiveMinimum: -1,
          },
        },
        required: ["code"],
      }),
      includeArtifacts: true,
      name: "ConstrainedUser",
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.output).toMatchObject({
      title: "ConstrainedUser",
      minProperties: 1,
      maxProperties: 8,
      properties: {
        code: {
          type: "string",
          pattern: "^[A-Z]+$",
          minLength: 2,
          maxLength: 8,
        },
        age: {
          type: "integer",
          minimum: 0,
          exclusiveMinimum: -1,
        },
      },
      required: ["code"],
    });
    expect(result.artifacts?.constraints?.entries.length).toBeGreaterThan(0);
    expect(result.preservedCapabilities).toEqual([
      "shape-ir",
      "constraint-ir",
      "string-constraints",
      "numeric-constraints",
      "object-constraints",
    ]);
    expect(collectUserFacingDiagnostics(result)).toEqual([]);
  });

  it("covers an unsupported source flow with a structured parse failure", () => {
    const result = convert({
      sourceFormat: "typescript",
      targetFormat: "json-schema",
      input: "export type User = () => string;",
      name: "UserDocument",
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result).toMatchObject({
      ok: false,
      phase: "parse",
      code: "unsupported-typescript-function-type",
    });

    const diagnostics = collectUserFacingDiagnostics(result);

    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "unsupported-typescript-function-type",
      source: "sdk",
    });
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.source === "parser-typescript",
      ),
    ).toBe(true);
    expect(
      diagnostics.find(
        (diagnostic) => diagnostic.source === "parser-typescript",
      ),
    ).toMatchObject({
      sourceRange: {
        start: { offset: 19, line: 1, column: 20 },
        end: { offset: 31, line: 1, column: 32 },
        length: 12,
      },
    });
  });

  it("covers invalid input with a structured parse failure", () => {
    const result = convert({
      sourceFormat: "json",
      targetFormat: "typescript",
      input: "{ invalid",
      name: "BrokenDocument",
    });

    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(result).toMatchObject({
      ok: false,
      phase: "parse",
      code: "invalid-json",
      message: "The input is not valid JSON.",
    });

    const diagnostics = collectUserFacingDiagnostics(result);

    expect(diagnostics[0]).toMatchObject({
      severity: "error",
      code: "invalid-json",
      source: "sdk",
      message: "The input is not valid JSON.",
    });
  });
});
