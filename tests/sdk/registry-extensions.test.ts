import { describe, expect, it } from "vitest";
import {
  schemaDocument,
  schemaScalarNode,
  valueDocument,
  valueScalarNode,
  type IrTransformerDescriptor,
  type GeneratorDescriptor,
  type ParserDescriptor,
} from "@schema-transformation-toolkit/core";
import {
  createConversionRegistry,
  createConverter,
  defaultConversionRegistry,
  publicConvertResultSchema,
} from "../../packages/sdk/src/index.js";
import type { ConversionRegistry } from "../../packages/sdk/src/types.js";
import { resolveConversionRouteDecision } from "../../packages/sdk/src/registry.js";
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

const failingExtensionGenerator: GeneratorDescriptor = {
  ...extensionGenerator,
  format: "fixture-failing-target",
  capabilities: {
    ...extensionGenerator.capabilities,
    target: "fixture-failing-target",
  },
  options: {
    ...extensionGenerator.options,
    format: "fixture-failing-target",
  },
  generate() {
    return {
      ok: false,
      code: "fixture-generator-failed",
      message: "The fixture generator failed.",
    };
  },
};

const valueOnlyParser: ParserDescriptor = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "value-source",
  capabilities: {
    format: "value-source",
    producesIr: ["value"],
    outputs: [{ ir: "value" }],
    capabilities: ["value-ir"],
  },
  options: { format: "value-source", role: "parser", options: [] },
  parse(_input, context) {
    return {
      ok: true,
      document: valueDocument(context.name, valueScalarNode("value")),
    };
  },
};

const valueToShapeFixture: IrTransformerDescriptor = {
  kind: "transformer",
  id: "value-to-shape-fixture",
  descriptorVersion: "0.1",
  inputIr: "value",
  outputIr: "shape",
  options: {
    format: "value-to-shape-fixture",
    role: "transformer",
    options: [
      {
        key: "mode",
        label: "Mode",
        description: "Fixture transformer mode.",
        category: "semantics",
        defaultValue: "default",
        affectedStages: ["transform"],
        semanticEffect: "Controls the fixture transform behavior.",
        diagnosticEffect: "No diagnostic effect.",
        examples: [
          {
            title: "Fixture mode",
            options: { mode: "configured" },
            explanation: "Uses the configured fixture mode.",
          },
        ],
        supported: true,
      },
    ],
  },
  transform(input, context) {
    if (
      (context.options as { mode?: string } | undefined)?.mode !== "configured"
    ) {
      return {
        ok: false,
        code: "fixture-transform-options-missing",
        message: "The configured transformer mode was not passed.",
      };
    }
    return {
      ok: true,
      document: schemaDocument(input.document.name, schemaScalarNode("string")),
      diagnostics: [
        {
          severity: "info",
          code: "fixture-transform-diagnostic",
          message: "The fixture transformer ran.",
          source: "transformer-value-to-shape-fixture",
        },
      ],
      semanticNotes: [
        {
          kind: "normalization",
          code: "fixture-transform-note",
          message: "The fixture transformer normalized the value.",
          layer: "shape",
          source: "transformer-value-to-shape-fixture",
        },
      ],
    };
  },
};

describe("sdk extensible registry", () => {
  it("resolves builtin transformers through a registry transformer lookup", () => {
    const registry: ConversionRegistry = {
      registerParser: defaultConversionRegistry.registerParser,
      registerGenerator: defaultConversionRegistry.registerGenerator,
      listParsers: defaultConversionRegistry.listParsers,
      listGenerators: defaultConversionRegistry.listGenerators,
      ...(defaultConversionRegistry.transformer
        ? { transformer: defaultConversionRegistry.transformer }
        : {}),
    };

    const result = createConverter(registry).convert({
      sourceFormat: "json",
      targetFormat: "typescript",
      input: '{"id":1}',
    });

    expect(result.ok).toBe(true);
  });

  it("retains pipeline artifacts when a generator fails", () => {
    const registry = createConversionRegistry({
      parsers: [extensionParser],
      generators: [failingExtensionGenerator],
    });

    const result = createConverter(registry).convert({
      sourceFormat: "fixture-source",
      targetFormat: "fixture-failing-target",
      input: "fixture",
    });

    expect(result).toMatchObject({
      ok: false,
      phase: "generate",
      code: "fixture-generator-failed",
      artifacts: {
        shape: expect.objectContaining({ kind: "document" }),
      },
    });
  });

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
    expect(converter.listOptionCatalogs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ format: "fixture-source", role: "parser" }),
        expect.objectContaining({
          format: "fixture-target",
          role: "generator",
        }),
      ]),
    );
    expect(converter.describeParserOptions("fixture-source").format).toBe(
      "fixture-source",
    );
    expect(converter.describeGeneratorOptions("fixture-target").format).toBe(
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

  it("keeps custom registry output typing separate from builtin output aliases", () => {
    interface FixtureOutputs {
      "fixture-target": string;
    }
    const registry = createConversionRegistry({
      parsers: [extensionParser],
      generators: [extensionGenerator],
    });
    const converter = createConverter<FixtureOutputs>(registry);
    const result = converter.convert({
      sourceFormat: "fixture-source",
      targetFormat: "fixture-target",
      input: "ignored",
    });

    expect(result).toMatchObject({
      ok: true,
      output: "fixture:fixture_sourceDocument",
    });
    if (result.ok) {
      const typedOutput: string = result.output;
      expect(typedOutput).toBe("fixture:fixture_sourceDocument");
    }
  });

  it("executes a registered transformer between parser and generator", () => {
    const registry = createConversionRegistry({
      parsers: [valueOnlyParser],
      generators: [extensionGenerator],
      transformers: [valueToShapeFixture],
    });
    const converter = createConverter(registry);

    expect(
      converter.planConversion("value-source", "fixture-target", "shape"),
    ).toMatchObject({
      irSequence: ["value", "shape"],
      stages: expect.arrayContaining([
        { kind: "transform-ir", from: "value", to: "shape", ir: "shape" },
      ]),
    });
    const result = converter.convert({
      sourceFormat: "value-source",
      targetFormat: "fixture-target",
      input: "ignored",
      irPreference: "shape",
      advanced: {
        transformer: {
          "value-to-shape-fixture": { mode: "configured" },
        },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      output: "fixture:value_sourceDocument",
      report: {
        diagnostics: {
          transform: [
            expect.objectContaining({ code: "fixture-transform-diagnostic" }),
          ],
        },
        semanticNotes: {
          transform: [
            expect.objectContaining({ code: "fixture-transform-note" }),
          ],
        },
      },
    });
    expect(() => publicConvertResultSchema.parse(result)).not.toThrow();
    expect(converter.collectUserFacingDiagnostics(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "fixture-transform-note" }),
      ]),
    );
  });

  it("does not leak route-planning registry exceptions", () => {
    const registry: ConversionRegistry = {
      ...defaultConversionRegistry,
      listTransformers() {
        throw new Error("internal registry detail");
      },
    };

    const result = createConverter(registry).convert({
      sourceFormat: "json",
      targetFormat: "typescript",
      input: '{"id":1}',
    });

    expect(result).toMatchObject({
      ok: false,
      code: "conversion-orchestration-failed",
      phase: "parse",
      message: "Conversion orchestration failed.",
    });
    expect(JSON.stringify(result)).not.toContain("internal registry detail");
  });

  it("keeps the public route view aligned with the core pipeline plan", () => {
    const registry = createConversionRegistry({
      parsers: [valueOnlyParser],
      generators: [extensionGenerator],
      transformers: [valueToShapeFixture],
    });
    const decision = resolveConversionRouteDecision(
      "value-source",
      "fixture-target",
      "shape",
      registry,
    );
    const routeTransformStages = decision.route.stages.filter(
      (stage) => stage.kind === "transform-ir",
    );

    expect(routeTransformStages.map((stage) => [stage.from, stage.to])).toEqual(
      decision.pipelinePlan.stages.map((stage) => [stage.from, stage.to]),
    );
    expect(decision.pipelinePlan.selectedIr).toBe("shape");
  });

  it("exposes transformer options through the converter facade", () => {
    const unusedTransformer: IrTransformerDescriptor = {
      ...valueToShapeFixture,
      id: "unused-transformer",
      inputIr: "shape",
      outputIr: "shape",
      options: {
        ...valueToShapeFixture.options!,
        format: "unused-transformer",
      },
    };
    const registry = createConversionRegistry({
      parsers: [valueOnlyParser],
      generators: [extensionGenerator],
      transformers: [valueToShapeFixture, unusedTransformer],
    });
    const converter = createConverter(registry);

    expect(
      converter.describeConversionOptions("value-source", "fixture-target")
        .transformers,
    ).toEqual([expect.objectContaining({ format: "value-to-shape-fixture" })]);
    expect(converter.listTransformerOptions()).toEqual([
      expect.objectContaining({ format: "unused-transformer" }),
      expect.objectContaining({ format: "value-to-shape-fixture" }),
    ]);
    expect(converter.listSourceFormatSupports()).toEqual([
      expect.objectContaining({ format: "value-source" }),
    ]);
    expect(converter.listTargetFormatSupports()).toEqual([
      expect.objectContaining({ format: "fixture-target" }),
    ]);
    expect(converter.describeFormatSupport("fixture-target")).toMatchObject({
      format: "fixture-target",
    });
  });

  it("uses advanced transformer options first and extension options as fallback", () => {
    const registry = createConversionRegistry({
      parsers: [valueOnlyParser],
      generators: [extensionGenerator],
      transformers: [valueToShapeFixture],
    });
    const converter = createConverter(registry);

    expect(
      converter.convert({
        sourceFormat: "value-source",
        targetFormat: "fixture-target",
        input: "ignored",
        irPreference: "shape",
        extension: {
          transformer: { "value-to-shape-fixture": { mode: "configured" } },
        },
      }),
    ).toMatchObject({ ok: true, output: "fixture:value_sourceDocument" });

    expect(
      converter.convert({
        sourceFormat: "value-source",
        targetFormat: "fixture-target",
        input: "ignored",
        irPreference: "shape",
        advanced: {
          transformer: { "value-to-shape-fixture": { mode: "configured" } },
        },
        extension: {
          transformer: { "value-to-shape-fixture": { mode: "wrong" } },
        },
      }),
    ).toMatchObject({ ok: true, output: "fixture:value_sourceDocument" });
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
