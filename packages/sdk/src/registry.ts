import {
  generatorEntriesFromCapabilities,
  IrCompatibilityError,
  planIrPipeline,
  parserOutputsFromCapabilities,
  defaultIrTransformers,
  valueToShapeTransformer,
} from "@schema-transformation-toolkit/core";
import type {
  ConversionRoute,
  ConversionRouteCapabilities,
  EntryIrKind,
  GeneratorCapabilities,
  GeneratorDescriptor,
  IrDocument,
  IrKind,
  IrPipelinePlan,
  IrTransformerDescriptor,
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
  entries: import("@schema-transformation-toolkit/core").IrInputContract[];
}

type RegisteredGeneratorDescriptor = GeneratorDescriptor<
  never,
  unknown,
  unknown
>;
type RegisteredTransformerDescriptor = IrTransformerDescriptor;

const normalizedCapabilities = new WeakMap<
  GeneratorDescriptor,
  NormalizedGeneratorCapabilities
>();

class MutableConversionRegistry implements ConversionRegistry {
  private readonly parsers = new Map<string, ParserDescriptor>();
  private readonly generators = new Map<
    string,
    RegisteredGeneratorDescriptor
  >();
  private readonly transformers = new Map<
    string,
    RegisteredTransformerDescriptor
  >();

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

  registerGenerator(descriptor: RegisteredGeneratorDescriptor): void {
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

  registerTransformer(descriptor: RegisteredTransformerDescriptor): void {
    if (
      descriptor.kind !== "transformer" ||
      descriptor.descriptorVersion !== "0.1" ||
      descriptor.id.trim().length === 0 ||
      !isIrKind(descriptor.inputIr) ||
      !isIrKind(descriptor.outputIr)
    ) {
      throw new DescriptorRegistrationError(
        "descriptor-missing-handler",
        "Invalid transformer descriptor.",
      );
    }
    if (typeof descriptor.transform !== "function") {
      throw new DescriptorRegistrationError(
        "descriptor-missing-handler",
        `Transformer "${descriptor.id}" must provide transform().`,
      );
    }
    if (this.transformers.has(descriptor.id)) {
      throw new DescriptorRegistrationError(
        "descriptor-duplicate-format",
        `A transformer is already registered for "${descriptor.id}".`,
      );
    }
    this.transformers.set(descriptor.id, descriptor);
  }

  listParsers(): ParserDescriptor[] {
    return [...this.parsers.values()];
  }

  listGenerators(): RegisteredGeneratorDescriptor[] {
    return [...this.generators.values()];
  }

  listTransformers(): RegisteredTransformerDescriptor[] {
    return [...this.transformers.values()];
  }

  transformer(id: string): RegisteredTransformerDescriptor {
    const descriptor = this.transformers.get(id);
    if (!descriptor) {
      throw new ConversionRouteError(
        "unsupported-route",
        `Unsupported transformer: ${id}`,
      );
    }
    return descriptor;
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

  generator(format: string): RegisteredGeneratorDescriptor {
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
    generators?: RegisteredGeneratorDescriptor[];
    transformers?: RegisteredTransformerDescriptor[];
  } = {},
): ConversionRegistry {
  const registry = new MutableConversionRegistry();
  for (const parser of options.parsers ?? []) registry.registerParser(parser);
  for (const generator of options.generators ?? []) {
    registry.registerGenerator(generator);
  }
  for (const transformer of options.transformers ?? []) {
    registry.registerTransformer(transformer);
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
    resolveTransformerDescriptors(registry),
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
  transformerIds: readonly string[];
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
    resolveTransformerDescriptors(registry),
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
    supportsValueIr: canPlanIr(
      parserCapabilities,
      normalizedGenerator,
      "value",
      resolveTransformerDescriptors(registry),
    ),
    supportsShapeIr: canPlanIr(
      parserCapabilities,
      normalizedGenerator,
      "shape",
      resolveTransformerDescriptors(registry),
    ),
    supportsConstraintIr: supportsConstraintIr(
      parserCapabilities,
      normalizedGenerator,
    ),
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
): GeneratorDescriptor<IrDocument, TOutput, unknown> {
  if (registry.generator) {
    return registry.generator(targetFormat) as unknown as GeneratorDescriptor<
      IrDocument,
      TOutput,
      unknown
    >;
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
  return descriptor as unknown as GeneratorDescriptor<
    IrDocument,
    TOutput,
    unknown
  >;
}

export function resolveTransformerDescriptor(
  id: string,
  registry: ConversionRegistry = defaultConversionRegistry,
): IrTransformerDescriptor {
  const descriptor = registry
    .listTransformers?.()
    .find((candidate) => candidate.id === id);
  if (descriptor) return descriptor;
  if (id === valueToShapeTransformer.id) return valueToShapeTransformer;
  if (registry.transformer) return registry.transformer(id);
  if (!descriptor) {
    throw new ConversionRouteError(
      "unsupported-route",
      `Unsupported transformer: ${id}`,
    );
  }
  return descriptor;
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
  transformers: readonly IrTransformerDescriptor[],
): ConversionExecutionPlan {
  let genericPlan: IrPipelinePlan;
  try {
    genericPlan = planIrPipeline({
      parserOutputs: parserOutputsFromCapabilities(parserCapabilities),
      generatorEntries: normalizedGenerator.entries,
      transformers,
      preference: irPreference,
    });
  } catch (error) {
    if (error instanceof IrCompatibilityError) {
      throw new ConversionRouteError(
        error.code,
        error.code === "unsupported-route"
          ? `Unsupported conversion route: ${sourceFormat} -> ${targetFormat}.`
          : `IR preference "${irPreference}" is not available for ${sourceFormat} -> ${targetFormat}.`,
      );
    }
    throw error;
  }

  const selectedIr = genericPlan.selectedIr;
  if (selectedIr === "constraint") {
    throw new ConversionRouteError(
      "unsupported-route",
      `Generator route ${sourceFormat} -> ${targetFormat} requires Constraint IR as its primary input, which the SDK generator contract does not support.`,
    );
  }
  const canUseValue = canPlanIr(
    parserCapabilities,
    normalizedGenerator,
    "value",
    transformers,
  );
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
      transformerIds: [],
    };
  }

  const irSequence: IrKind[] = [
    ...(parserCapabilities.producesIr.includes("value")
      ? ["value" as const]
      : []),
    "shape",
    ...(genericPlan.requiredArtifacts?.includes("constraint") ||
    (parserCapabilities.producesIr.includes("constraint") &&
      normalizedGenerator.overlays.includes("constraint"))
      ? ["constraint" as const]
      : []),
  ];
  const requiresShapeInference = genericPlan.stages.some(
    (stage) => stage.from === "value" && stage.to === "shape",
  );
  const requiresConstraintInference = genericPlan.stages.some(
    (stage) => stage.to === "constraint",
  );

  const route: ConversionRoute = {
    sourceFormat,
    targetFormat,
    irSequence,
    stages: buildPipelineStages(
      sourceFormat,
      targetFormat,
      parserCapabilities,
      genericPlan,
    ),
  };
  return {
    route,
    selectedIr,
    requestedIr: irPreference,
    fallback: irPreference === "auto" && !canUseValue,
    requiresShapeInference,
    requiresConstraintInference,
    generatorInputIr: "shape",
    parserRequestedIr: requiresShapeInference ? ["value"] : ["shape"],
    transformerIds: genericPlan.stages.map((stage) => stage.transformerId),
  };
}

function buildPipelineStages(
  sourceFormat: string,
  targetFormat: string,
  parserCapabilities: ParserCapabilities,
  genericPlan: IrPipelinePlan,
): PipelineStage[] {
  const usesValueTransformation = genericPlan.stages[0]?.from === "value";
  const stages: PipelineStage[] =
    parserCapabilities.producesIr.includes("value") && usesValueTransformation
      ? [
          {
            kind: "parse-source",
            from: sourceFormat,
            to: `${sourceFormat}-value`,
          },
          {
            kind: "lower-to-value",
            from: `${sourceFormat}-value`,
            to: "value",
            ir: "value",
          },
        ]
      : [
          {
            kind: "parse-source",
            from: sourceFormat,
            to: genericPlan.selectedIr,
            ir: genericPlan.selectedIr,
          },
        ];
  if (usesValueTransformation) {
    stages.push(
      ...genericPlan.stages.map((stage) => ({
        kind: "transform-ir" as const,
        from: stage.from,
        to: stage.to,
        ir: stage.to,
      })),
    );
  }
  stages.push({
    kind: "generate-target",
    from: genericPlan.selectedIr,
    to: targetFormat,
    ir: genericPlan.selectedIr,
  });
  return stages;
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
  if (capabilities.entries?.some((entry) => entry.ir === "constraint")) {
    throw new DescriptorRegistrationError(
      "descriptor-capability-mismatch",
      `Generator "${capabilities.target}" cannot use Constraint IR as an entry contract.`,
    );
  }
  const declaredEntries = capabilities.entries;
  const entriesIr = declaredEntries?.map((entry) => entry.ir as EntryIrKind);
  const entryIr = entriesIr ?? capabilities.entryIr ?? legacyEntryIr;
  const overlays = capabilities.overlays ?? legacyOverlays;

  if (
    (capabilities.entryIr &&
      !sameIrKinds(capabilities.entryIr, legacyEntryIr)) ||
    (entriesIr && !sameIrKinds(entriesIr, legacyEntryIr)) ||
    (capabilities.overlays &&
      !sameIrKinds(capabilities.overlays, legacyOverlays))
  ) {
    throw new DescriptorRegistrationError(
      "descriptor-capability-mismatch",
      `Generator "${capabilities.target}" has inconsistent consumesIr and normalized IR capability fields.`,
    );
  }

  const declaredValueRoots = declaredEntries?.find(
    (entry) => entry.ir === "value",
  )?.valueRootKinds;
  if (
    declaredValueRoots &&
    capabilities.valueRootKinds &&
    !sameValueRootKinds(declaredValueRoots, capabilities.valueRootKinds)
  ) {
    throw new DescriptorRegistrationError(
      "descriptor-capability-mismatch",
      `Generator "${capabilities.target}" has inconsistent Value root-shape fields.`,
    );
  }

  return {
    entryIr: [...entryIr],
    overlays: [...overlays],
    entries: generatorEntriesFromCapabilities(capabilities),
    ...((declaredEntries?.find((entry) => entry.ir === "value")
      ?.valueRootKinds ?? capabilities.valueRootKinds)
      ? {
          valueRootKinds: [
            ...(declaredEntries?.find((entry) => entry.ir === "value")
              ?.valueRootKinds ??
              capabilities.valueRootKinds ??
              []),
          ],
        }
      : {}),
  };
}

function canPlanIr(
  parserCapabilities: ParserCapabilities,
  generatorCapabilities: NormalizedGeneratorCapabilities,
  preference: Exclude<ConversionIrPreference, "auto">,
  transformers: readonly IrTransformerDescriptor[],
): boolean {
  try {
    planIrPipeline({
      parserOutputs: parserOutputsFromCapabilities(parserCapabilities),
      generatorEntries: generatorCapabilities.entries,
      transformers,
      preference,
    });
    return true;
  } catch {
    return false;
  }
}

function supportsConstraintIr(
  parserCapabilities: ParserCapabilities,
  generatorCapabilities: NormalizedGeneratorCapabilities,
): boolean {
  const parserOutputs = parserOutputsFromCapabilities(parserCapabilities);
  const parserProvidesConstraint = parserOutputs.some(
    (output) =>
      output.ir === "constraint" || output.artifacts?.includes("constraint"),
  );
  const generatorAcceptsConstraint =
    generatorCapabilities.overlays.includes("constraint") ||
    generatorCapabilities.entries.some((entry) =>
      entry.artifacts?.includes("constraint"),
    );
  return parserProvidesConstraint && generatorAcceptsConstraint;
}

function resolveTransformerDescriptors(
  registry: ConversionRegistry,
): readonly IrTransformerDescriptor[] {
  return [...(registry.listTransformers?.() ?? []), ...defaultIrTransformers];
}

function sameIrKinds(
  left: readonly IrKind[],
  right: readonly IrKind[],
): boolean {
  return left.length === right.length && left.every((ir) => right.includes(ir));
}

function sameValueRootKinds(
  left: readonly ValueRootKind[],
  right: readonly ValueRootKind[],
): boolean {
  return (
    left.length === right.length && left.every((kind) => right.includes(kind))
  );
}

function isIrKind(value: unknown): value is IrKind {
  return value === "value" || value === "shape" || value === "constraint";
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
  if (descriptor.capabilities.outputs) {
    const outputs = descriptor.capabilities.outputs;
    if (
      outputs.length === 0 ||
      outputs.some((output) => !isIrKind(output.ir)) ||
      !sameIrKinds(
        outputs.map((output) => output.ir),
        descriptor.capabilities.producesIr,
      )
    ) {
      throw new DescriptorRegistrationError(
        "descriptor-capability-mismatch",
        `Parser "${descriptor.format}" has inconsistent producesIr and outputs fields.`,
      );
    }
    const valueOutput = outputs.find((output) => output.ir === "value");
    if (
      valueOutput?.valueRootKinds &&
      descriptor.capabilities.valueRootKinds &&
      !sameValueRootKinds(
        valueOutput.valueRootKinds,
        descriptor.capabilities.valueRootKinds,
      )
    ) {
      throw new DescriptorRegistrationError(
        "descriptor-capability-mismatch",
        `Parser "${descriptor.format}" has inconsistent Value root-shape fields.`,
      );
    }
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
