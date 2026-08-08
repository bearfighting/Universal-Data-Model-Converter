import {
  generatorEntriesFromCapabilities,
  IrCompatibilityError,
  planIrPipeline,
  parserOutputsFromCapabilities,
  defaultIrTransformers,
  valueToShapeTransformer,
  createDescriptorRegistry,
  DescriptorLookupError,
  DescriptorRegistryError as DescriptorRegistrationError,
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
  DescriptorRegistry,
  DescriptorRegistryErrorCode,
} from "@schema-transformation-toolkit/core";
import { createBuiltinRegistry } from "./generated/builtin-registry.js";
import type {
  ConversionFormat,
  ConversionIrPreference,
  ConversionRegistry,
} from "./types.js";

export type { DescriptorRegistryErrorCode as DescriptorRegistrationErrorCode };

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

export { DescriptorRegistrationError };

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

export function createConversionRegistry(
  options: {
    parsers?: ParserDescriptor[];
    generators?: RegisteredGeneratorDescriptor[];
    transformers?: RegisteredTransformerDescriptor[];
  } = {},
): ConversionRegistry {
  const registry = createDescriptorRegistry();
  const customTransformerIds = new Set(
    (options.transformers ?? []).map((descriptor) => descriptor.id),
  );
  return adaptDescriptorRegistry(registry, {
    ...options,
    transformers: [
      ...defaultIrTransformers.filter(
        (descriptor) => !customTransformerIds.has(descriptor.id),
      ),
      ...(options.transformers ?? []),
    ],
  });
}

export const defaultConversionRegistry = adaptDescriptorRegistry(
  createBuiltinRegistry(),
);

function adaptDescriptorRegistry(
  coreRegistry: DescriptorRegistry,
  initial: {
    parsers?: ParserDescriptor[];
    generators?: RegisteredGeneratorDescriptor[];
    transformers?: RegisteredTransformerDescriptor[];
  } = {},
): ConversionRegistry {
  const registerParser = (descriptor: ParserDescriptor): void => {
    try {
      coreRegistry.registerParser(descriptor);
    } catch (error) {
      throw toSdkRegistrationError(error);
    }
  };
  const registerGenerator = (
    descriptor: RegisteredGeneratorDescriptor,
  ): void => {
    try {
      coreRegistry.registerGenerator(descriptor);
      normalizedCapabilities.set(
        descriptor,
        normalizeGeneratorCapabilities(descriptor.capabilities),
      );
    } catch (error) {
      throw toSdkRegistrationError(error);
    }
  };
  const registerTransformer = (
    descriptor: RegisteredTransformerDescriptor,
  ): void => {
    try {
      coreRegistry.registerTransformer(descriptor);
    } catch (error) {
      throw toSdkRegistrationError(error);
    }
  };

  for (const parser of initial.parsers ?? []) registerParser(parser);
  for (const generator of initial.generators ?? [])
    registerGenerator(generator);
  for (const transformer of initial.transformers ?? []) {
    registerTransformer(transformer);
  }

  return {
    registerParser,
    registerGenerator,
    registerTransformer,
    listParsers: () => coreRegistry.listParsers(),
    listGenerators: () =>
      coreRegistry.listGenerators() as RegisteredGeneratorDescriptor[],
    listTransformers: () => coreRegistry.listTransformers(),
    parser(format) {
      try {
        return coreRegistry.parser(format);
      } catch (error) {
        throw toSdkLookupError(error, "source format", format);
      }
    },
    generator(format) {
      try {
        return coreRegistry.generator(format) as RegisteredGeneratorDescriptor;
      } catch (error) {
        throw toSdkLookupError(error, "target format", format);
      }
    },
    transformer(id) {
      try {
        return coreRegistry.transformer(id);
      } catch (error) {
        throw toSdkLookupError(error, "transformer", id);
      }
    },
  };
}

function toSdkRegistrationError(error: unknown): DescriptorRegistrationError {
  if (error instanceof DescriptorRegistrationError) return error;
  throw error;
}

function toSdkLookupError(
  error: unknown,
  label: string,
  id: string,
): ConversionRouteError {
  if (error instanceof DescriptorLookupError) {
    return new ConversionRouteError(
      "unsupported-route",
      `Unsupported ${label}: ${id}`,
    );
  }
  throw error;
}

export function listConversionRoutes(
  registry: ConversionRegistry = defaultConversionRegistry,
): ConversionRoute[] {
  const sources = registry.listParsers();
  const targets = registry.listGenerators();

  return sources
    .flatMap((source) =>
      targets.flatMap((target) => {
        try {
          return [planConversion(source.format, target.format, registry)];
        } catch {
          return [];
        }
      }),
    )
    .sort(compareRoutes);
}

function compareRoutes(left: ConversionRoute, right: ConversionRoute): number {
  return (
    left.sourceFormat.localeCompare(right.sourceFormat) ||
    left.targetFormat.localeCompare(right.targetFormat) ||
    left.irSequence.join("\0").localeCompare(right.irSequence.join("\0")) ||
    left.stages
      .map(
        (stage) => `${stage.kind}:${stage.from}:${stage.to}:${stage.ir ?? ""}`,
      )
      .join("\0")
      .localeCompare(
        right.stages
          .map(
            (stage) =>
              `${stage.kind}:${stage.from}:${stage.to}:${stage.ir ?? ""}`,
          )
          .join("\0"),
      )
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
  pipelinePlan: IrPipelinePlan;
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
      pipelinePlan: genericPlan,
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
    pipelinePlan: genericPlan,
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
  const registered = registry.listTransformers?.();
  if (!registered) return defaultIrTransformers;
  const defaultIds = new Set(
    defaultIrTransformers.map((descriptor) => descriptor.id),
  );
  return [
    ...registered.filter((descriptor) => !defaultIds.has(descriptor.id)),
    ...registered.filter((descriptor) => defaultIds.has(descriptor.id)),
  ];
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
