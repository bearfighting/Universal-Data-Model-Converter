import { describe, expect, it } from "vitest";
import { schemaDocument, schemaScalarNode } from "@aio/core";
import { jsonParserDescriptor } from "../../packages/parsers/json/src/index.js";
import { jsonSchemaParserDescriptor } from "../../packages/parsers/json-schema/src/index.js";
import { typeScriptParserDescriptor } from "../../packages/parsers/typescript/src/index.js";
import { jsonSchemaGeneratorDescriptor } from "../../packages/generators/json-schema/src/index.js";
import { typeScriptGeneratorDescriptor } from "../../packages/generators/typescript/src/index.js";
import { zodGeneratorDescriptor } from "../../packages/generators/zod/src/index.js";
import {
  createConversionRegistry,
  createConverter,
} from "../../packages/sdk/src/index.js";
import {
  expectDescriptorRegistrationFailure,
  expectGeneratorDescriptorContract,
  expectParserDescriptorContract,
  expectValidGeneratorDescriptor,
  expectValidParserDescriptor,
} from "../helpers/descriptor-contract.js";

describe("format descriptor contracts", () => {
  it("validates all built-in parser descriptors", () => {
    expectParserDescriptorContract(jsonParserDescriptor, [
      { input: '{"id":1}' },
      { input: "not-json", expectSuccess: false },
    ]);
    expectParserDescriptorContract(jsonSchemaParserDescriptor, [
      { input: '{"type":"string"}' },
      { input: '{"type":"unsupported"}', expectSuccess: false },
    ]);
    expectParserDescriptorContract(typeScriptParserDescriptor, [
      { input: "export type User = { id: string }" },
      { input: "export type User = () => void", expectSuccess: false },
    ]);
  });

  it("validates deterministic built-in generator descriptors", () => {
    const document = schemaDocument(
      "DescriptorContract",
      schemaScalarNode("string"),
    );
    expectGeneratorDescriptorContract(jsonSchemaGeneratorDescriptor, [
      { document },
    ]);
    expectGeneratorDescriptorContract(typeScriptGeneratorDescriptor, [
      { document },
    ]);
    expectGeneratorDescriptorContract(zodGeneratorDescriptor, [{ document }]);
  });

  it("reports stable registration error codes", () => {
    expectDescriptorRegistrationFailure(
      () =>
        createConversionRegistry({
          parsers: [
            {
              ...jsonParserDescriptor,
              descriptorVersion: "0.2" as "0.1",
            },
          ],
        }),
      "descriptor-invalid-version",
    );
    expectDescriptorRegistrationFailure(
      () =>
        createConversionRegistry({
          parsers: [
            {
              ...jsonParserDescriptor,
              format: "mismatch",
            },
          ],
        }),
      "descriptor-format-mismatch",
    );
    expectValidParserDescriptor(jsonParserDescriptor);
    expectValidGeneratorDescriptor(typeScriptGeneratorDescriptor);
  });

  it("preserves custom generator output through a typed converter", () => {
    const customGenerator = {
      ...typeScriptGeneratorDescriptor,
      format: "contract-object",
      capabilities: {
        ...typeScriptGeneratorDescriptor.capabilities,
        target: "contract-object",
      },
      options: {
        ...typeScriptGeneratorDescriptor.options,
        format: "contract-object",
      },
      generate() {
        return { ok: true as const, output: { kind: "custom", count: 1 } };
      },
    };
    const registry = createConversionRegistry({
      parsers: [jsonParserDescriptor],
      generators: [customGenerator],
    });

    const converter = createConverter<{
      "contract-object": { kind: string; count: number };
    }>(registry);
    const result = converter.convert({
      sourceFormat: "json",
      targetFormat: "contract-object",
      input: '{"id":1}',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.kind).toBe("custom");
      expect(result.output.count).toBe(1);
    }
  });

  it("turns analysis hook failures into structured generation failures", () => {
    const failingGenerator = {
      ...typeScriptGeneratorDescriptor,
      format: "analysis-failure",
      capabilities: {
        ...typeScriptGeneratorDescriptor.capabilities,
        target: "analysis-failure",
      },
      options: {
        ...typeScriptGeneratorDescriptor.options,
        format: "analysis-failure",
      },
      analysis: {
        planSemanticLosses() {
          throw new Error("internal analysis detail");
        },
      },
    };
    const converter = createConverter(
      createConversionRegistry({
        parsers: [jsonParserDescriptor],
        generators: [failingGenerator],
      }),
    );

    const result = converter.convert({
      sourceFormat: "json",
      targetFormat: "analysis-failure",
      input: '{"id":1}',
    });

    expect(result).toMatchObject({
      ok: false,
      code: "generator-analysis-failed",
      phase: "generate",
      message: "The target generator analysis failed.",
    });
    expect(JSON.stringify(result)).not.toContain("internal analysis detail");
  });

  it("rejects invalid Shape IR returned by a parser at runtime", () => {
    const invalidParser = {
      ...jsonParserDescriptor,
      format: "invalid-shape-source",
      capabilities: {
        ...jsonParserDescriptor.capabilities,
        format: "invalid-shape-source",
      },
      options: {
        ...jsonParserDescriptor.options,
        format: "invalid-shape-source",
      },
      parse() {
        return {
          ok: true as const,
          document: { invalid: true },
        } as never;
      },
    };
    const converter = createConverter(
      createConversionRegistry({
        parsers: [invalidParser],
        generators: [typeScriptGeneratorDescriptor],
      }),
    );
    const result = converter.convert({
      sourceFormat: "invalid-shape-source",
      targetFormat: "typescript",
      input: "ignored",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "parser-invalid-shape",
      phase: "parse",
    });
  });
});
