import { describe, expect, it } from "vitest";
import type {
  GeneratorDescriptor,
  ParserDescriptor,
} from "@schema-transformation-toolkit/core";
import {
  generatorOptionsFor,
  parserOptionsFor,
  transformerOptionsFor,
} from "../../packages/sdk/src/component-options.js";
import type { ConvertOptions } from "../../packages/sdk/src/types.js";
import {
  createConversionRegistry,
  createConverter,
} from "../../packages/sdk/src/index.js";
import {
  valueDocument,
  valueScalarNode,
} from "../../packages/core/src/index.js";

function parser(format: string): ParserDescriptor {
  return { format } as ParserDescriptor;
}

function generator(format: string): GeneratorDescriptor {
  return { format } as GeneratorDescriptor;
}

const baseOptions: ConvertOptions = {
  sourceFormat: "json",
  targetFormat: "typescript",
  input: "{}",
};

describe("component option adaptation", () => {
  it("resolves every builtin advanced option by descriptor format", () => {
    const options = {
      ...baseOptions,
      advanced: {
        parser: {
          json: { strict: true },
          jsonSchema: { strict: true },
          typeScript: { moduleResolution: "bundler" },
          openapi: { version: "3.1" },
          zod: { strict: true },
          yaml: { strict: true },
          csv: { delimiter: ";" },
          toml: { strict: true },
        },
        generator: {
          jsonSchema: { dialect: "2020-12" },
          typeScript: { style: "interface" },
          zod: { outputLanguage: "typescript" },
          openapi: { version: "3.1.0" },
          yaml: {},
          csv: { delimiter: ";" },
          toml: { inlineTables: true },
        },
      },
    } as unknown as ConvertOptions;

    expect(parserOptionsFor(parser("json-schema"), options)).toEqual({
      strict: true,
    });
    expect(parserOptionsFor(parser("typescript"), options)).toEqual({
      moduleResolution: "bundler",
    });
    expect(generatorOptionsFor(generator("json-schema"), options)).toEqual({
      dialect: "2020-12",
    });
    expect(generatorOptionsFor(generator("toml"), options)).toEqual({
      inlineTables: true,
    });
  });

  it("uses extension options for custom formats and isolates builtin formats", () => {
    const options = {
      ...baseOptions,
      advanced: {
        parser: { json: undefined },
        generator: { json: undefined },
      },
      extension: {
        parser: { custom: true },
        generator: { custom: true },
      },
    } as unknown as ConvertOptions;

    expect(parserOptionsFor(parser("custom-format"), options)).toEqual({
      custom: true,
    });
    expect(generatorOptionsFor(generator("custom-format"), options)).toEqual({
      custom: true,
    });
    expect(parserOptionsFor(parser("json"), options)).toEqual({});
    expect(generatorOptionsFor(generator("json"), options)).toEqual({});
    expect(parserOptionsFor(parser("json"), baseOptions)).toEqual({});
    expect(generatorOptionsFor(generator("json"), baseOptions)).toEqual({});
  });

  it("falls back to extension transformer options when advanced options omit the id", () => {
    const options = {
      ...baseOptions,
      advanced: { transformer: { "other-transformer": { mode: "advanced" } } },
      extension: {
        transformer: { "custom-transformer": { mode: "extension" } },
      },
    } as unknown as ConvertOptions;

    expect(transformerOptionsFor("custom-transformer", options)).toEqual({
      mode: "extension",
    });
  });

  it("forwards extension options through the public custom converter path", () => {
    let parserContextOptions: unknown;
    let generatorContextOptions: unknown;
    const parserDescriptor: ParserDescriptor = {
      kind: "parser",
      descriptorVersion: "0.1",
      format: "option-source",
      capabilities: {
        format: "option-source",
        producesIr: ["value"],
        outputs: [{ ir: "value" }],
        capabilities: ["value-ir"],
      },
      options: { format: "option-source", role: "parser", options: [] },
      parse(_input, context) {
        parserContextOptions = context.options;
        return {
          ok: true,
          document: valueDocument(context.name, valueScalarNode("value")),
        };
      },
    };
    const generatorDescriptor: GeneratorDescriptor = {
      kind: "generator",
      descriptorVersion: "0.1",
      format: "option-target",
      capabilities: {
        target: "option-target",
        consumesIr: ["value"],
        entries: [{ ir: "value" }],
        supportsCapabilities: ["value-ir"],
      },
      options: { format: "option-target", role: "generator", options: [] },
      generate(_input, context) {
        generatorContextOptions = context.options;
        return { ok: true, output: "ok" };
      },
    };
    const converter = createConverter(
      createConversionRegistry({
        parsers: [parserDescriptor],
        generators: [generatorDescriptor],
      }),
    );

    expect(
      converter.convert({
        sourceFormat: "option-source",
        targetFormat: "option-target",
        input: "ignored",
        extension: {
          parser: { parserOption: true },
          generator: { generatorOption: true },
        },
      }),
    ).toMatchObject({ ok: true, output: "ok" });
    expect(parserContextOptions).toEqual({ parserOption: true });
    expect(generatorContextOptions).toEqual({ generatorOption: true });
  });
});
