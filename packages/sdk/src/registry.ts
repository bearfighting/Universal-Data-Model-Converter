import type {
  ConversionRoute,
  ConversionRouteCapabilities,
  EntryIrKind,
  GeneratorCapabilities,
  GeneratorDescriptor,
  IrKind,
  OverlayIrKind,
  ParserCapabilities,
  ParserDescriptor,
  PipelineStage,
  ValueRootKind,
} from "@schema-transformation-toolkit/core";
import { typeScriptGeneratorDescriptor } from "@schema-transformation-toolkit/generator-typescript";
import { jsonGeneratorDescriptor } from "@schema-transformation-toolkit/generator-json";
import { csvGeneratorDescriptor } from "@schema-transformation-toolkit/generator-csv";
import { tomlGeneratorDescriptor } from "@schema-transformation-toolkit/generator-toml";
import { jsonSchemaGeneratorDescriptor as jsonSchemaDescriptor } from "@schema-transformation-toolkit/generator-json-schema";
import { openApiGeneratorDescriptor } from "@schema-transformation-toolkit/generator-openapi";
import { zodGeneratorDescriptor } from "@schema-transformation-toolkit/generator-zod";
import { yamlGeneratorDescriptor } from "@schema-transformation-toolkit/generator-yaml";
import { jsonParserDescriptor } from "@schema-transformation-toolkit/parser-json";
import { csvParserDescriptor } from "@schema-transformation-toolkit/parser-csv";
import { tomlParserDescriptor } from "@schema-transformation-toolkit/parser-toml";
import { jsonSchemaParserDescriptor } from "@schema-transformation-toolkit/parser-json-schema";
import { typeScriptParserDescriptor } from "@schema-transformation-toolkit/parser-typescript";
import { openApiParserDescriptor } from "@schema-transformation-toolkit/parser-openapi";
import { zodParserDescriptor } from "@schema-transformation-toolkit/parser-zod";
import { yamlParserDescriptor } from "@schema-transformation-toolkit/parser-yaml";
import type {
  ConversionFormat,
  ConversionIrPreference,
  ConversionRegistry,
} from "./types.js";

export type DescriptorRegistrationErrorCode =
  | "descriptor-invalid-version"
  | "descriptor-format-mismatch"
  | "descriptor-options-mismatch"
  | "descriptor-missing-shape-ir"
  | "descriptor-missing-ir"
  | "descriptor-missing-handler"
  | "descriptor-capability-mismatch"
  | "descriptor-duplicate-format";

export type ConversionRouteErrorCode =
  "unsupported-route" | "unsupported-ir-preference";

export class ConversionRouteError extends Error {
  readonly code: ConversionRouteErrorCode;

  constructor(code: ConversionRouteErrorCode, message: string) {
    super(message);
    this.name = "ConversionRouteError";
    this.code = code;
  }
}

export class DescriptorRegistrationError extends Error {
  readonly code: DescriptorRegistrationErrorCode;

  constructor(code: DescriptorRegistrationErrorCode, message: string) {
    super(message);
    this.name = "DescriptorRegistrationError";
    this.code = code;
  }
}

export interface NormalizedGeneratorCapabilities {
  entryIr: EntryIrKind[];
  overlays: OverlayIrKind[];
  valueRootKinds?: ValueRootKind[];
}

const normalizedCapabilities = new WeakMap<
  GeneratorDescriptor,
  NormalizedGeneratorCapabilities
>();

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
    normalizedCapabilities.set(
      descriptor,
      normalizeGeneratorCapabilities(descriptor.capabilities),
    );
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
      throw new ConversionRouteError(
        "unsupported-route",
        `Unsupported source format: ${format}`,
      );
    }
    return descriptor;
  }

  generator(format: string): GeneratorDescriptor {
    const descriptor = this.generators.get(format);
    if (!descriptor) {
      throw new ConversionRouteError(
        "unsupported-route",
        `Unsupported target format: ${format}`,
      );
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
    csvParserDescriptor,
    tomlParserDescriptor,
    jsonSchemaParserDescriptor,
    typeScriptParserDescriptor,
    openApiParserDescriptor,
    zodParserDescriptor,
    yamlParserDescriptor,
  ],
  generators: [
    jsonGeneratorDescriptor,
    csvGeneratorDescriptor,
    tomlGeneratorDescriptor,
    jsonSchemaDescriptor,
    typeScriptGeneratorDescriptor,
    zodGeneratorDescriptor,
    yamlGeneratorDescriptor,
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
  registryOrPreference:
    ConversionRegistry | ConversionIrPreference = defaultConversionRegistry,
  providedRegistry?: ConversionRegistry,
): ConversionRoute {
  const irPreference =
    typeof registryOrPreference === "string" ? registryOrPreference : "auto";
  const registry =
    typeof registryOrPreference === "string"
      ? (providedRegistry ?? defaultConversionRegistry)
      : registryOrPreference;
  const parserCapabilities = resolveParserCapabilities(sourceFormat, registry);
  const normalizedGenerator = resolveNormalizedGeneratorCapabilities(
    targetFormat,
    registry,
  );
  return resolveConversionRoute(
    sourceFormat,
    targetFormat,
    parserCapabilities,
    normalizedGenerator,
    irPreference,
  ).route;
}

export interface ConversionExecutionPlan {
  route: ConversionRoute;
  selectedIr: Exclude<ConversionIrPreference, "auto">;
  requestedIr: ConversionIrPreference;
  fallback: boolean;
  requiresShapeInference: boolean;
  requiresConstraintInference: boolean;
  generatorInputIr: Exclude<ConversionIrPreference, "auto">;
  parserRequestedIr: readonly IrKind[];
}

/** @deprecated Use ConversionExecutionPlan. */
export type ConversionRouteDecision = ConversionExecutionPlan;

export function resolveConversionRouteDecision(
  sourceFormat: ConversionFormat,
  targetFormat: ConversionFormat,
  irPreference: ConversionIrPreference = "auto",
  registry: ConversionRegistry = defaultConversionRegistry,
): ConversionExecutionPlan {
  const parserCapabilities = resolveParserCapabilities(sourceFormat, registry);
  const normalizedGenerator = resolveNormalizedGeneratorCapabilities(
    targetFormat,
    registry,
  );

  return resolveConversionRoute(
    sourceFormat,
    targetFormat,
    parserCapabilities,
    normalizedGenerator,
    irPreference,
  );
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
  const normalizedGenerator = resolveNormalizedGeneratorCapabilities(
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
    supportsValueIr:
      parserCapabilities.producesIr.includes("value") &&
      normalizedGenerator.entryIr.includes("value") &&
      compatibleValueRootKinds(parserCapabilities, normalizedGenerator),
    supportsShapeIr:
      parserCapabilities.producesIr.includes("shape") &&
      normalizedGenerator.entryIr.includes("shape"),
    supportsConstraintIr:
      parserCapabilities.producesIr.includes("constraint") &&
      normalizedGenerator.overlays.includes("constraint"),
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
  return resolveParserDescriptor(sourceFormat, registry).capabilities;
}

export function resolveGeneratorCapabilities(
  targetFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): GeneratorCapabilities {
  return resolveGeneratorDescriptor(targetFormat, registry).capabilities;
}

export function resolveParserDescriptor(
  sourceFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): ParserDescriptor {
  if (registry.parser) return registry.parser(sourceFormat);
  const descriptor = registry
    .listParsers()
    .find((candidate) => candidate.format === sourceFormat);
  if (!descriptor) {
    throw new ConversionRouteError(
      "unsupported-route",
      `Unsupported source format: ${sourceFormat}`,
    );
  }
  return descriptor;
}

export function resolveGeneratorDescriptor<TOutput = unknown>(
  targetFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): GeneratorDescriptor<TOutput> {
  if (registry.generator) {
    return registry.generator(targetFormat) as GeneratorDescriptor<TOutput>;
  }
  const descriptor = registry
    .listGenerators()
    .find((candidate) => candidate.format === targetFormat);
  if (!descriptor) {
    throw new ConversionRouteError(
      "unsupported-route",
      `Unsupported target format: ${targetFormat}`,
    );
  }
  return descriptor as GeneratorDescriptor<TOutput>;
}

export function resolveNormalizedGeneratorCapabilities(
  targetFormat: ConversionFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): NormalizedGeneratorCapabilities {
  const descriptor = resolveGeneratorDescriptor(targetFormat, registry);
  return (
    normalizedCapabilities.get(descriptor) ??
    normalizeGeneratorCapabilities(descriptor.capabilities)
  );
}

function resolveConversionRoute(
  sourceFormat: string,
  targetFormat: string,
  parserCapabilities: ParserCapabilities,
  normalizedGenerator: NormalizedGeneratorCapabilities,
  irPreference: ConversionIrPreference,
): ConversionExecutionPlan {
  const canUseValue =
    parserCapabilities.producesIr.includes("value") &&
    normalizedGenerator.entryIr.includes("value") &&
    compatibleValueRootKinds(parserCapabilities, normalizedGenerator);
  const canUseShape =
    parserCapabilities.producesIr.includes("shape") &&
    normalizedGenerator.entryIr.includes("shape");
  const selectedIr =
    irPreference === "value"
      ? canUseValue
        ? "value"
        : undefined
      : irPreference === "shape"
        ? canUseShape
          ? "shape"
          : undefined
        : canUseValue
          ? "value"
          : canUseShape
            ? "shape"
            : undefined;

  if (selectedIr === undefined) {
    const otherIrAvailable =
      irPreference === "value"
        ? canUseShape
        : irPreference === "shape"
          ? canUseValue
          : false;
    throw new ConversionRouteError(
      otherIrAvailable ? "unsupported-ir-preference" : "unsupported-route",
      otherIrAvailable
        ? `IR preference "${irPreference}" is not available for ${sourceFormat} -> ${targetFormat}.`
        : `Unsupported conversion route: ${sourceFormat} -> ${targetFormat}.`,
    );
  }

  if (selectedIr === "value") {
    const route: ConversionRoute = {
      sourceFormat,
      targetFormat,
      irSequence: ["value"] as IrKind[],
      stages: [
        {
          kind: "parse-source",
          from: sourceFormat,
          to: `${sourceFormat}-value`,
          ir: "value",
        },
        {
          kind: "lower-to-value",
          from: `${sourceFormat}-value`,
          to: "value",
          ir: "value",
        },
        {
          kind: "generate-target",
          from: "value",
          to: targetFormat,
          ir: "value",
        },
      ],
    };
    return {
      route,
      selectedIr,
      requestedIr: irPreference,
      fallback: irPreference === "auto" && !canUseValue,
      requiresShapeInference: false,
      requiresConstraintInference: false,
      generatorInputIr: "value",
      parserRequestedIr: ["value"],
    };
  }

  const irSequence: IrKind[] = [];
  if (parserCapabilities.producesIr.includes("value")) irSequence.push("value");
  irSequence.push("shape");
  const requiresConstraintInference =
    parserCapabilities.producesIr.includes("constraint") &&
    normalizedGenerator.overlays.includes("constraint");
  if (requiresConstraintInference) {
    irSequence.push("constraint");
  }

  const route: ConversionRoute = {
    sourceFormat,
    targetFormat,
    irSequence,
    stages: buildPipelineStages(
      sourceFormat,
      targetFormat,
      parserCapabilities,
      requiresConstraintInference,
    ),
  };
  return {
    route,
    selectedIr,
    requestedIr: irPreference,
    fallback: irPreference === "auto" && !canUseValue,
    requiresShapeInference: parserCapabilities.producesIr.includes("value"),
    requiresConstraintInference,
    generatorInputIr: "shape",
    parserRequestedIr: irSequence,
  };
}

function buildPipelineStages(
  sourceFormat: string,
  targetFormat: string,
  parserCapabilities: ParserCapabilities,
  requiresConstraintInference: boolean,
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
      ...(requiresConstraintInference
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

function normalizeGeneratorCapabilities(
  capabilities: GeneratorCapabilities,
): NormalizedGeneratorCapabilities {
  const legacyEntryIr = capabilities.consumesIr.filter(
    (ir): ir is EntryIrKind => ir === "value" || ir === "shape",
  );
  const legacyOverlays = capabilities.consumesIr.filter(
    (ir): ir is OverlayIrKind => ir === "constraint",
  );
  const entryIr = capabilities.entryIr ?? legacyEntryIr;
  const overlays = capabilities.overlays ?? legacyOverlays;

  if (
    (capabilities.entryIr &&
      !sameIrKinds(capabilities.entryIr, legacyEntryIr)) ||
    (capabilities.overlays &&
      !sameIrKinds(capabilities.overlays, legacyOverlays))
  ) {
    throw new DescriptorRegistrationError(
      "descriptor-capability-mismatch",
      `Generator "${capabilities.target}" has inconsistent consumesIr and normalized IR capability fields.`,
    );
  }

  return {
    entryIr: [...entryIr],
    overlays: [...overlays],
    ...(capabilities.valueRootKinds
      ? { valueRootKinds: [...capabilities.valueRootKinds] }
      : {}),
  };
}

function compatibleValueRootKinds(
  parserCapabilities: ParserCapabilities,
  generatorCapabilities: NormalizedGeneratorCapabilities,
): boolean {
  const parserRoots = parserCapabilities.valueRootKinds;
  const generatorRoots = generatorCapabilities.valueRootKinds;
  if (!parserRoots || !generatorRoots) return true;
  return parserRoots.some((root) => generatorRoots.includes(root));
}

function sameIrKinds(
  left: readonly IrKind[],
  right: readonly IrKind[],
): boolean {
  return left.length === right.length && left.every((ir) => right.includes(ir));
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
  if (descriptor.capabilities.producesIr.length === 0) {
    throw new DescriptorRegistrationError(
      "descriptor-missing-ir",
      `Parser "${descriptor.format}" must produce at least one IR kind.`,
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
  if (descriptor.capabilities.consumesIr.length === 0) {
    throw new DescriptorRegistrationError(
      "descriptor-missing-ir",
      `Generator "${descriptor.format}" must consume at least one IR kind.`,
    );
  }
  normalizeGeneratorCapabilities(descriptor.capabilities);
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
