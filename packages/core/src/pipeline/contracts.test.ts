import { describe, expect, it } from "vitest";
import {
  constraintDocument,
  executeGenerator,
  executeParser,
  executeIrTransformer,
  isIrBundle,
  schemaDocument,
  schemaScalarNode,
  valueDocument,
  valueScalarNode,
  tryValidateIrBundle,
  type IrTransformerDescriptor,
  type GeneratorDescriptor,
  type ParserDescriptor,
  type ParseResult,
} from "../index.js";

describe("pipeline IR contracts", () => {
  it("represents a primary document and supplementary artifacts", () => {
    const value = valueDocument("Contract", valueScalarNode("value"));
    const shape = schemaDocument("Contract", schemaScalarNode("string"));
    const constraints = constraintDocument("Contract");
    const result: ParseResult<typeof shape> = {
      ok: true,
      document: shape,
      artifacts: { value, constraints },
    };

    expect(result).toEqual({
      ok: true,
      document: shape,
      artifacts: { value, constraints },
    });
    expect(isIrBundle({ document: value })).toBe(true);
    expect(isIrBundle({ document: null })).toBe(false);
    expect(isIrBundle(null)).toBe(false);
  });

  it("supports transformer contracts without format coupling", () => {
    const transformer: IrTransformerDescriptor = {
      kind: "transformer",
      id: "value-to-shape-fixture",
      descriptorVersion: "0.1",
      inputIr: "value",
      outputIr: "shape",
      transform(input) {
        if (input.document.kind !== "value-document") {
          return {
            ok: false,
            code: "invalid-transformer-input",
            message: "The fixture requires Value IR.",
          };
        }
        return {
          ok: true,
          document: schemaDocument(
            input.document.name,
            schemaScalarNode("string"),
          ),
        };
      },
    };

    const result = executeIrTransformer(
      transformer,
      { document: valueDocument("Contract", valueScalarNode("value")) },
      {},
    );
    expect(result).toMatchObject({ ok: true, document: { kind: "document" } });
    expect(
      executeIrTransformer(
        transformer,
        { document: schemaDocument("Contract", schemaScalarNode("string")) },
        {},
      ),
    ).toMatchObject({ ok: false, code: "transformer-input-mismatch" });
  });

  it("rejects a transformer that returns an undeclared IR kind", () => {
    const transformer: IrTransformerDescriptor = {
      kind: "transformer",
      id: "bad-output",
      descriptorVersion: "0.1",
      inputIr: "value",
      outputIr: "shape",
      transform: () => ({
        ok: true,
        document: valueDocument("Contract", valueScalarNode("wrong")),
      }),
    };

    expect(
      executeIrTransformer(
        transformer,
        { document: valueDocument("Contract", valueScalarNode("value")) },
        {},
      ),
    ).toMatchObject({ ok: false, code: "transformer-output-mismatch" });
  });

  it("validates parser and generator boundaries independently of SDK", () => {
    const parser: ParserDescriptor = {
      kind: "parser",
      format: "fixture",
      descriptorVersion: "0.1",
      capabilities: {
        format: "fixture",
        producesIr: ["value"],
        outputs: [{ ir: "value" }],
        capabilities: ["value-ir"],
      },
      options: { format: "fixture", role: "parser", options: [] },
      parse: () => ({
        ok: true,
        document: { kind: "value-document" } as never,
      }),
    };
    expect(executeParser(parser, "input", { name: "Fixture" })).toMatchObject({
      ok: false,
      code: "invalid-value-document",
    });

    const generator: GeneratorDescriptor = {
      kind: "generator",
      format: "object-only",
      descriptorVersion: "0.1",
      capabilities: {
        target: "object-only",
        consumesIr: ["value"],
        entries: [{ ir: "value", valueRootKinds: ["object"] }],
        supportsCapabilities: ["value-ir"],
      },
      options: { format: "object-only", role: "generator", options: [] },
      generate: () => ({ ok: true, output: "unexpected" }),
    };
    expect(
      executeGenerator(
        generator,
        {
          document: schemaDocument("Fixture", schemaScalarNode("string")),
        },
        {},
      ),
    ).toMatchObject({ ok: false, code: "invalid-generator-input" });
  });

  it("rejects malformed documents and duplicated primary artifacts", () => {
    expect(
      tryValidateIrBundle({ document: { kind: "value-document" } }),
    ).toMatchObject({ ok: false });

    const value = valueDocument("Contract", valueScalarNode("value"));
    expect(
      tryValidateIrBundle({ document: value, artifacts: { value } }),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: "duplicate-ir-document" }],
    });

    expect(
      tryValidateIrBundle({
        document: value,
        artifacts: { shape: { kind: "value-document" } },
      }),
    ).toMatchObject({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ code: "invalid-value-document" }),
      ]),
    });
  });
});
