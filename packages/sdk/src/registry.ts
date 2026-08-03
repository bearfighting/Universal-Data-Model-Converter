import type {
  ConversionRoute,
  ConversionRouteCapabilities,
  GeneratorCapabilities,
  GeneratorDescriptor,
  IrKind,
  ParserCapabilities,
  ParserDescriptor,
  PipelineStage,
} from "@aio/core";
import { typeScriptGeneratorDescriptor } from "@aio/generator-typescript";
import { jsonSchemaGeneratorDescriptor as jsonSchemaDescriptor } from "@aio/generator-json-schema";
import { openApiGeneratorDescriptor } from "@aio/generator-openapi";
import { zodGeneratorDescriptor } from "@aio/generator-zod";
import { jsonParserDescriptor } from "@aio/parser-json";
import { jsonSchemaParserDescriptor } from "@aio/parser-json-schema";
import { typeScriptParserDescriptor } from "@aio/parser-typescript";
import { openApiParserDescriptor } from "@aio/parser-openapi";
import type { ConversionFormat, ConversionRegistry } from "./types.js";

export type DescriptorRegistrationErrorCode =
  | "descriptor-invalid-version"
  | "descriptor-format-mismatch"
  | "descriptor-options-mismatch"
  | "descriptor-missing-shape-ir"
  | "descriptor-missing-handler"
  | "descriptor-duplicate-format";

export class DescriptorRegistrationError extends Error {
  readonly code: DescriptorRegistrationErrorCode;

  constructor(code: DescriptorRegistrationErrorCode, message: string) {
    super(message);
    this.name = "DescriptorRegistrationError";
    this.code = code;
  }
}

class MutableConversionRegistry implements ConversionRegistry {
  private readonly parsers = new Map<string, ParserDescriptor>();
  private readonly generators = new Map<string, GeneratorDescriptor>();

  registerParser(descriptor: ParserDescriptor): void {
    validateParserDescriptor(descriptor);
    if (this.parsers.has(descriptor.format)) {
      throw new DescriptorRegistrationError(
        "descriptor-duplicate-format",
        `A parser is already registered for "${descriptor.format}".`,
      );
    }
    this.parsers.set(descriptor.format, descriptor);
  }

  registerGenerator(descriptor: GeneratorDescriptor): void {
    validateGeneratorDescriptor(descriptor);
    if (this.generators.has(descriptor.format)) {
      throw new DescriptorRegistrationError(
        "descriptor-duplicate-format",
        `A generator is already registered for "${descriptor.format}".`,
      );
    }
    this.generators.set(descriptor.format, descriptor);
  }

  listParsers(): ParserDescriptor[] {
    return [...this.parsers.values()];
  }

  listGenerators(): GeneratorDescriptor[] {
    return [...this.generators.values()];
  }

  parser(format: string): ParserDescriptor {
    const descriptor = this.parsers.get(format);
    if (!descriptor) {
      throw new Error(`Unsupported source format: ${format}`);
    }
    return descriptor;
  }

  generator(format: string): GeneratorDescriptor {
    const descriptor = this.generators.get(format);
    if (!descriptor) {
      throw new Error(`Unsupported target format: ${format}`);
    }
    return descriptor;
  }
}

export function createConversionRegistry(
  options: {
    parsers?: ParserDescriptor[];
    generators?: GeneratorDescriptor[];
  } = {},
): ConversionRegistry {
  const registry = new MutableConversionRegistry();
  for (const parser of options.parsers ?? []) registry.registerParser(parser);
  for (const generator of options.generators ?? []) {
    registry.registerGenerator(generator);
  }
  return registry;
}

export const defaultConversionRegistry = createConversionRegistry({
  parsers: [
    jsonParserDescriptor,
    jsonSchemaParserDescriptor,
    typeScriptParserDescriptor,
    openApiParserDescriptor,
  ],
  generators: [
    jsonSchemaDescriptor,
    typeScriptGeneratorDescriptor,
    zodGeneratorDescriptor,
    openApiGeneratorDescriptor,
  ],
});

export function listConversionRoutes(
  registry: ConversionRegistry = defaultConversionRegistry,
): ConversionRoute[] {
  const sources = registry.listParsers();
  const targets = registry.listGenerators();

  return sources.flatMap((source) =>
    targets.flatMap((target) => {
      try {
        return [planConversion(source.format, target.format, registry)];
      } catch {
        return [];
      }
    }),
  );
}

export function planConversion(
  sourceFormat: ConversionFormat,
  targetFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): ConversionRoute {
  const parserCapabilities = resolveParserCapabilities(sourceFormat, registry);
  const generatorCapabilities = resolveGeneratorCapabilities(
    targetFormat,
    registry,
  );
  const route = buildConversionRoute(
    sourceFormat,
    targetFormat,
    parserCapabilities,
    generatorCapabilities,
  );

  if (route === undefined) {
    throw new Error(
      `Unsupported conversion route: ${sourceFormat} -> ${targetFormat}`,
    );
  }

  return route;
}

export function describeConversionRouteCapabilities(
  sourceFormat: ConversionFormat,
  targetFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): ConversionRouteCapabilities {
  const parserCapabilities = resolveParserCapabilities(sourceFormat, registry);
  const generatorCapabilities = resolveGeneratorCapabilities(
    targetFormat,
    registry,
  );
  const preservedCapabilities = parserCapabilities.capabilities.filter(
    (capability) =>
      generatorCapabilities.supportsCapabilities.includes(capability),
  );
  const potentiallyLostCapabilities = parserCapabilities.capabilities.filter(
    (capability) =>
      !generatorCapabilities.supportsCapabilities.includes(capability),
  );

  return {
    supportsValueIr: parserCapabilities.producesIr.includes("value"),
    supportsShapeIr:
      parserCapabilities.producesIr.includes("shape") &&
      generatorCapabilities.consumesIr.includes("shape"),
    supportsConstraintIr:
      parserCapabilities.producesIr.includes("constraint") &&
      generatorCapabilities.consumesIr.includes("constraint"),
    parserCapabilities: parserCapabilities.capabilities,
    generatorCapabilities: generatorCapabilities.supportsCapabilities,
    preservedCapabilities,
    potentiallyLostCapabilities,
  };
}

export function routeUsesIr(route: ConversionRoute, irKind: IrKind): boolean {
  return route.irSequence.includes(irKind);
}

export function routeStages(route: ConversionRoute): PipelineStage[] {
  return route.stages;
}

export function resolveParserCapabilities(
  sourceFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): ParserCapabilities {
  return getMutableRegistry(registry).parser(sourceFormat).capabilities;
}

export function resolveGeneratorCapabilities(
  targetFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): GeneratorCapabilities {
  return getMutableRegistry(registry).generator(targetFormat).capabilities;
}

export function resolveParserDescriptor(
  sourceFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): ParserDescriptor {
  return getMutableRegistry(registry).parser(sourceFormat);
}

export function resolveGeneratorDescriptor<TOutput = unknown>(
  targetFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): GeneratorDescriptor<TOutput> {
  return getMutableRegistry(registry).generator(
    targetFormat,
  ) as GeneratorDescriptor<TOutput>;
}

function getMutableRegistry(
  registry: ConversionRegistry,
): MutableConversionRegistry {
  if (!(registry instanceof MutableConversionRegistry)) {
    return createConversionRegistry({
      parsers: registry.listParsers(),
      generators: registry.listGenerators(),
    }) as MutableConversionRegistry;
  }
  return registry;
}

function buildConversionRoute(
  sourceFormat: string,
  targetFormat: string,
  parserCapabilities: ParserCapabilities,
  generatorCapabilities: GeneratorCapabilities,
): ConversionRoute | undefined {
  if (!parserCapabilities.producesIr.includes("shape")) return undefined;
  if (!generatorCapabilities.consumesIr.includes("shape")) return undefined;

  const irSequence: IrKind[] = [];
  if (parserCapabilities.producesIr.includes("value")) irSequence.push("value");
  irSequence.push("shape");
  if (
    parserCapabilities.producesIr.includes("constraint") &&
    generatorCapabilities.consumesIr.includes("constraint")
  ) {
    irSequence.push("constraint");
  }

  return {
    sourceFormat,
    targetFormat,
    irSequence,
    stages: buildPipelineStages(
      sourceFormat,
      targetFormat,
      parserCapabilities,
      generatorCapabilities,
    ),
  };
}

function buildPipelineStages(
  sourceFormat: string,
  targetFormat: string,
  parserCapabilities: ParserCapabilities,
  generatorCapabilities: GeneratorCapabilities,
): PipelineStage[] {
  if (parserCapabilities.producesIr.includes("value")) {
    return [
      { kind: "parse-source", from: sourceFormat, to: `${sourceFormat}-value` },
      {
        kind: "lower-to-value",
        from: `${sourceFormat}-value`,
        to: "value",
        ir: "value",
      },
      { kind: "infer-shape", from: "value", to: "shape", ir: "shape" },
      ...(parserCapabilities.producesIr.includes("constraint") &&
      generatorCapabilities.consumesIr.includes("constraint")
        ? [
            {
              kind: "derive-constraints" as const,
              from: "shape",
              to: "constraint",
              ir: "constraint" as const,
            },
          ]
        : []),
      { kind: "generate-target", from: "shape", to: targetFormat },
    ];
  }

  return [
    { kind: "parse-source", from: sourceFormat, to: "shape", ir: "shape" },
    { kind: "generate-target", from: "shape", to: targetFormat },
  ];
}

function validateParserDescriptor(descriptor: ParserDescriptor): void {
  if (descriptor.descriptorVersion !== "0.1") {
    throw new DescriptorRegistrationError(
      "descriptor-invalid-version",
      `Unsupported parser descriptor version: ${descriptor.descriptorVersion}.`,
    );
  }
  if (descriptor.kind !== "parser" || descriptor.format.length === 0) {
    throw new DescriptorRegistrationError(
      "descriptor-format-mismatch",
      "Invalid parser descriptor: kind and format are required.",
    );
  }
  if (descriptor.capabilities.format !== descriptor.format) {
    throw new DescriptorRegistrationError(
      "descriptor-format-mismatch",
      `Parser descriptor format does not match its capabilities: ${descriptor.format}.`,
    );
  }
  if (!descriptor.capabilities.producesIr.includes("shape")) {
    throw new DescriptorRegistrationError(
      "descriptor-missing-shape-ir",
      `Parser "${descriptor.format}" must produce shape IR.`,
    );
  }
  if (typeof descriptor.parse !== "function") {
    throw new DescriptorRegistrationError(
      "descriptor-missing-handler",
      `Parser "${descriptor.format}" must provide parse().`,
    );
  }
  if (
    descriptor.options.format !== descriptor.format ||
    descriptor.options.role !== "parser"
  ) {
    throw new DescriptorRegistrationError(
      "descriptor-options-mismatch",
      `Parser "${descriptor.format}" options metadata does not match its descriptor.`,
    );
  }
}

function validateGeneratorDescriptor(descriptor: GeneratorDescriptor): void {
  if (descriptor.descriptorVersion !== "0.1") {
    throw new DescriptorRegistrationError(
      "descriptor-invalid-version",
      `Unsupported generator descriptor version: ${descriptor.descriptorVersion}.`,
    );
  }
  if (descriptor.kind !== "generator" || descriptor.format.length === 0) {
    throw new DescriptorRegistrationError(
      "descriptor-format-mismatch",
      "Invalid generator descriptor: kind and format are required.",
    );
  }
  if (descriptor.capabilities.target !== descriptor.format) {
    throw new DescriptorRegistrationError(
      "descriptor-format-mismatch",
      `Generator descriptor format does not match its capabilities: ${descriptor.format}.`,
    );
  }
  if (!descriptor.capabilities.consumesIr.includes("shape")) {
    throw new DescriptorRegistrationError(
      "descriptor-missing-shape-ir",
      `Generator "${descriptor.format}" must consume shape IR.`,
    );
  }
  if (typeof descriptor.generate !== "function") {
    throw new DescriptorRegistrationError(
      "descriptor-missing-handler",
      `Generator "${descriptor.format}" must provide generate().`,
    );
  }
  if (
    descriptor.options.format !== descriptor.format ||
    descriptor.options.role !== "generator"
  ) {
    throw new DescriptorRegistrationError(
      "descriptor-options-mismatch",
      `Generator "${descriptor.format}" options metadata does not match its descriptor.`,
    );
  }
}
