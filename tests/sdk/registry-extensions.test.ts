import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaScalarNode,
  type GeneratorDescriptor,
  type ParserDescriptor,
} from "@schema-transformation-toolkit/core";
import {
  createConversionRegistry,
  createConverter,
  defaultConversionRegistry,
} from "../../packages/sdk/src/index.js";
import { jsonParserDescriptor } from "../../packages/parsers/json/src/index.js";
import { expectDescriptorRegistrationFailure } from "../helpers/descriptor-contract.js";

const extensionGenerator: GeneratorDescriptor = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "fixture-target",
  capabilities: {
    target: "fixture-target",
    consumesIr: ["shape"],
    supportsCapabilities: ["shape-ir"],
  },
  options: {
    format: "fixture-target",
    role: "generator",
    options: [],
  },
  generate(input) {
    const document = input.document;
    if (document.kind !== "document") {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "Expected Shape IR.",
      };
    }
    return { ok: true, output: `fixture:${document.name.source}` };
  },
};

const extensionParser: ParserDescriptor = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "fixture-source",
  capabilities: {
    format: "fixture-source",
    producesIr: ["shape"],
    capabilities: ["shape-ir"],
  },
  options: {
    format: "fixture-source",
    role: "parser",
    options: [],
  },
  parse(_input, context) {
    return {
      ok: true,
      document: schemaDocument(context.name, schemaScalarNode("string")),
    };
  },
};

describe("sdk extensible registry", () => {
  it("derives routes, support, and option catalogs from registered descriptors", () => {
    const registry = createConversionRegistry({
      parsers: [...defaultConversionRegistry.listParsers(), extensionParser],
      generators: [
        ...defaultConversionRegistry.listGenerators(),
        extensionGenerator,
      ],
    });
    const converter = createConverter(registry);

    expect(converter.listConversionRoutes()).toContainEqual(
      expect.objectContaining({
        sourceFormat: "fixture-source",
        targetFormat: "fixture-target",
      }),
    );
    expect(registry.listParsers().map((item) => item.format)).toContain(
      "fixture-source",
    );
    expect(registry.listGenerators().map((item) => item.format)).toContain(
      "fixture-target",
    );
    expect(
      converter.convert({
        sourceFormat: "fixture-source",
        targetFormat: "fixture-target",
        input: "ignored",
      }),
    ).toMatchObject({ ok: true, output: "fixture:fixture_sourceDocument" });
  });

  it("rejects duplicate and structurally invalid registrations", () => {
    const registry = createConversionRegistry({ parsers: [extensionParser] });

    expectDescriptorRegistrationFailure(
      () => registry.registerParser(extensionParser),
      "descriptor-duplicate-format",
    );
    expectDescriptorRegistrationFailure(
      () =>
        registry.registerParser({
          ...extensionParser,
          format: "invalid-parser",
          capabilities: {
            ...extensionParser.capabilities,
            format: "invalid-parser",
            producesIr: [],
          },
          options: {
            ...extensionParser.options,
            format: "invalid-parser",
          },
        }),
      "descriptor-missing-ir",
    );
    expectDescriptorRegistrationFailure(
      () =>
        registry.registerGenerator({
          ...extensionGenerator,
          format: "invalid-generator",
          capabilities: {
            ...extensionGenerator.capabilities,
            target: "invalid-generator",
            consumesIr: [],
          },
        }),
      "descriptor-missing-ir",
    );
    expectDescriptorRegistrationFailure(
      () =>
        registry.registerGenerator({
          ...extensionGenerator,
          format: "bad-options",
          capabilities: {
            ...extensionGenerator.capabilities,
            target: "bad-options",
          },
          options: { ...extensionGenerator.options, format: "other" },
        }),
      "descriptor-options-mismatch",
    );
    expectDescriptorRegistrationFailure(
      () =>
        registry.registerGenerator({
          ...extensionGenerator,
          format: "capability-mismatch",
          capabilities: {
            ...extensionGenerator.capabilities,
            target: "capability-mismatch",
            entryIr: ["value"],
          },
          options: {
            ...extensionGenerator.options,
            format: "capability-mismatch",
          },
        }),
      "descriptor-capability-mismatch",
    );
  });

  it("keeps the default registry isolated from custom registries", () => {
    const registry = createConversionRegistry();
    registry.registerGenerator(extensionGenerator);

    expect(defaultConversionRegistry.listGenerators()).not.toContain(
      extensionGenerator,
    );
  });

  it("prefers Value IR for a generator that supports both IR layers", () => {
    const dualGenerator: GeneratorDescriptor = {
      ...extensionGenerator,
      format: "dual-target",
      capabilities: {
        ...extensionGenerator.capabilities,
        target: "dual-target",
        consumesIr: ["value", "shape"],
      },
      options: { ...extensionGenerator.options, format: "dual-target" },
      generate(input) {
        const document = input.document;
        return {
          ok: true,
          output: document.kind === "value-document" ? "value" : "shape",
        };
      },
    };
    const registry = createConversionRegistry({
      parsers: [jsonParserDescriptor],
      generators: [dualGenerator],
    });
    const converter = createConverter(registry);

    expect(
      converter.convert({
        sourceFormat: "json",
        targetFormat: "dual-target",
        input: '[1,"a"]',
      }),
    ).toMatchObject({
      ok: true,
      output: "value",
      plan: { irSequence: ["value"] },
    });
    expect(
      converter.planConversion("json", "dual-target", "shape").irSequence,
    ).toEqual(["value", "shape"]);
    expect(
      converter.convert({
        sourceFormat: "json",
        targetFormat: "dual-target",
        input: '{"id":1}',
        irPreference: "shape",
      }),
    ).toMatchObject({ ok: true, output: "shape" });
  });
});
