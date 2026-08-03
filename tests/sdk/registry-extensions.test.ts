import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaScalarNode,
  type GeneratorDescriptor,
  type ParserDescriptor,
} from "@aio/core";
import {
  createConversionRegistry,
  createConverter,
  defaultConversionRegistry,
} from "../../packages/sdk/src/index.js";
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
  generate(document) {
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
            producesIr: ["value"],
          },
        }),
      "descriptor-missing-shape-ir",
    );
    expectDescriptorRegistrationFailure(
      () =>
        registry.registerGenerator({
          ...extensionGenerator,
          format: "invalid-generator",
          capabilities: {
            ...extensionGenerator.capabilities,
            target: "invalid-generator",
            consumesIr: ["value"],
          },
        }),
      "descriptor-missing-shape-ir",
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
  });

  it("keeps the default registry isolated from custom registries", () => {
    const registry = createConversionRegistry();
    registry.registerGenerator(extensionGenerator);

    expect(defaultConversionRegistry.listGenerators()).not.toContain(
      extensionGenerator,
    );
  });
});
