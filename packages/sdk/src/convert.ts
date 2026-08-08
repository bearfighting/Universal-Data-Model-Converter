import type {
  ConversionCapabilityRequirement,
  ConversionLossHotspot,
  PipelineExecutionResult,
} from "@schema-transformation-toolkit/core";
import { executePipeline } from "@schema-transformation-toolkit/core";
import type { JsonSchemaOutput } from "@schema-transformation-toolkit/generator-json-schema";
import type { OpenApiOutput } from "@schema-transformation-toolkit/generator-openapi";
import { planSemanticLosses } from "./losses.js";
import {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
  defaultConversionRegistry,
  resolveGeneratorDescriptor,
  resolveConversionRouteDecision,
  resolveTransformerDescriptor,
  ConversionRouteError,
} from "./registry.js";
import type { ConversionRegistry } from "./types.js";
import {
  buildConversionReport,
  collectPreservedCapabilities,
} from "./report.js";
import { generatorOptionsFor, parserOptionsFor } from "./component-options.js";
export type {
  ConvertAdvancedOptions,
  ConversionArtifacts,
  ConvertFailureResult,
  ConvertOptions,
  ConvertResult,
  ConvertSuccessResult,
  BuiltinSourceFormat,
  BuiltinTargetFormat,
  BuiltinGeneratorOutputs,
  ConversionIrPreference,
  ConversionFormat,
  ConversionOutput,
  ConversionRegistry,
  ConversionSourceFormat,
  ConversionTargetFormat,
  ExtensionConversionOptions,
} from "./types.js";
import type {
  ConvertOptions,
  ConvertResult,
  ConversionFormat,
  ConversionIrPreference,
  ConversionOutput,
} from "./types.js";

export {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
};

export interface ConversionConverter<
  TExtensions extends Record<string, unknown> = Record<never, never>,
> {
  convert<TTarget extends ConversionFormat>(
    options: ConvertOptions & { targetFormat: TTarget },
  ): ConvertResult<ConversionOutput<TTarget, TExtensions>>;
  listConversionRoutes(): ReturnType<typeof listConversionRoutes>;
  planConversion: (
    sourceFormat: ConversionFormat,
    targetFormat: ConversionFormat,
    irPreference?: ConversionIrPreference,
  ) => ReturnType<typeof planConversion>;
  describeConversionRouteCapabilities: typeof describeConversionRouteCapabilities;
}

export function createConverter<
  TExtensions extends Record<string, unknown> = Record<never, never>,
>(registry: ConversionRegistry): ConversionConverter<TExtensions> {
  return {
    convert: <TTarget extends ConversionFormat>(
      options: ConvertOptions & { targetFormat: TTarget },
    ) => convert<ConversionOutput<TTarget, TExtensions>>(options, registry),
    listConversionRoutes: () => listConversionRoutes(registry),
    planConversion: (sourceFormat, targetFormat, irPreference = "auto") =>
      planConversion(sourceFormat, targetFormat, irPreference, registry),
    describeConversionRouteCapabilities: (sourceFormat, targetFormat) =>
      describeConversionRouteCapabilities(sourceFormat, targetFormat, registry),
  };
}

export function convert<TOutput = string | JsonSchemaOutput | OpenApiOutput>(
  options: ConvertOptions,
  registry: ConversionRegistry = defaultConversionRegistry,
): ConvertResult<TOutput> {
  let plan: ReturnType<typeof planConversion>;
  let routeDecision: ReturnType<typeof resolveConversionRouteDecision>;
  try {
    routeDecision = resolveConversionRouteDecision(
      options.sourceFormat,
      options.targetFormat,
      options.irPreference ?? "auto",
      registry,
    );
    plan = routeDecision.route;
  } catch (error) {
    if (
      error instanceof ConversionRouteError &&
      (error.code === "unsupported-ir-preference" ||
        error.code === "unsupported-route")
    ) {
      return {
        ok: false,
        code: error.code,
        message:
          error.code === "unsupported-ir-preference"
            ? `The requested IR preference "${options.irPreference}" is not available for ${options.sourceFormat} -> ${options.targetFormat}.`
            : error.message,
        phase: "parse",
        plan: {
          sourceFormat: options.sourceFormat,
          targetFormat: options.targetFormat,
          irSequence: [],
          stages: [],
        },
      };
    }
    throw error;
  }
  const name = options.name ?? defaultDocumentName(options.sourceFormat);
  const capabilityRequirements: ConversionCapabilityRequirement[] = [];
  const lossHotspots: ConversionLossHotspot[] = [];
  const routeCapabilities = describeConversionRouteCapabilities(
    options.sourceFormat,
    options.targetFormat,
    registry,
  );

  const parser = resolveParserDescriptorForPipeline(
    options.sourceFormat,
    registry,
  );
  const generatorDescriptor = resolveGeneratorDescriptor<TOutput>(
    options.targetFormat,
    registry,
  );
  const transformers = routeDecision.pipelinePlan.stages.map((stage) =>
    resolveTransformerDescriptor(stage.transformerId, registry),
  );
  const pipelineResult = executePipeline<TOutput>({
    parser,
    generator: generatorDescriptor,
    transformers,
    plan: routeDecision.pipelinePlan,
    input: options.input,
    parserContext: {
      name,
      ...(routeDecision.parserRequestedIr[0]
        ? { requestedIr: routeDecision.parserRequestedIr[0] }
        : {}),
      options: parserOptionsFor(parser, options),
    },
    transformerContext: {},
    generatorContext: {
      options: generatorOptionsFor(generatorDescriptor, options),
    },
    sourceFormat: options.sourceFormat,
    targetFormat: options.targetFormat,
    routeCapabilities,
    lossPlanner: (context) =>
      planSemanticLosses(
        context.routeCapabilities,
        context.constraints,
        options.targetFormat,
        options.sourceFormat,
      ),
  });

  if (!pipelineResult.ok) {
    return pipelineFailureToConvertResult(pipelineResult, plan);
  }

  const valueArtifact = pipelineResult.bundle.artifacts?.value;
  const shapeArtifact = pipelineResult.bundle.artifacts?.shape;
  const constraintsArtifact = pipelineResult.bundle.artifacts?.constraints;
  if (shapeArtifact) {
    if (generatorDescriptor.analysis?.collectCapabilityRequirements) {
      capabilityRequirements.push(
        ...generatorDescriptor.analysis.collectCapabilityRequirements(
          shapeArtifact,
        ),
      );
    }
    if (generatorDescriptor.analysis?.collectLossHotspots) {
      lossHotspots.push(
        ...generatorDescriptor.analysis.collectLossHotspots(shapeArtifact),
      );
    }
  }

  const diagnostics = pipelineResult.diagnostics?.all ?? [];
  const losses = pipelineResult.losses ?? [];
  const semanticNotes = pipelineResult.semanticNotes?.all ?? [];
  const parseDiagnostics = pipelineResult.diagnostics?.parse ?? [];
  const transformDiagnostics = pipelineResult.diagnostics?.transform ?? [];
  const generateDiagnostics = pipelineResult.diagnostics?.generate ?? [];
  const parseSemanticNotes = pipelineResult.semanticNotes?.parse ?? [];
  const transformSemanticNotes = pipelineResult.semanticNotes?.transform ?? [];
  const generateSemanticNotes = pipelineResult.semanticNotes?.generate ?? [];

  const preservedCapabilities = collectPreservedCapabilities(
    options.sourceFormat,
    options.targetFormat,
    valueArtifact,
    shapeArtifact,
    constraintsArtifact,
    registry,
  );

  const report = buildConversionReport(
    parseDiagnostics,
    generateDiagnostics,
    losses,
    preservedCapabilities,
    parseSemanticNotes,
    generateSemanticNotes,
    capabilityRequirements,
    lossHotspots,
    {
      requested: routeDecision.requestedIr,
      selected: routeDecision.selectedIr,
      fallback: routeDecision.fallback,
    },
    transformDiagnostics,
    transformSemanticNotes,
  );

  return {
    ok: true,
    output: pipelineResult.output,
    plan,
    ...(report ? { report } : {}),
    ...(options.includeArtifacts
      ? {
          artifacts: {
            ...(valueArtifact ? { value: valueArtifact } : {}),
            ...(shapeArtifact ? { shape: shapeArtifact } : {}),
            ...(constraintsArtifact
              ? { constraints: constraintsArtifact }
              : {}),
          },
        }
      : {}),
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
    ...(losses.length > 0 ? { losses } : {}),
    ...(preservedCapabilities.length > 0 ? { preservedCapabilities } : {}),
    ...(semanticNotes.length > 0 ? { semanticNotes } : {}),
  };
}

function pipelineFailureToConvertResult<TOutput>(
  result: Exclude<PipelineExecutionResult<TOutput>, { ok: true }>,
  plan: ReturnType<typeof planConversion>,
): ConvertResult<TOutput> {
  const diagnostics = result.diagnostics?.all;
  return {
    ok: false,
    code:
      result.code === "invalid-ir-document" ||
      result.code === "invalid-shape-document"
        ? "parser-invalid-shape"
        : result.code,
    message: result.message,
    phase: result.phase,
    plan,
    ...(diagnostics && diagnostics.length > 0 ? { diagnostics } : {}),
  };
}

function resolveParserDescriptorForPipeline(
  sourceFormat: ConvertOptions["sourceFormat"],
  registry: ConversionRegistry,
) {
  const descriptor = registry.parser
    ? registry.parser(sourceFormat)
    : registry
        .listParsers()
        .find((candidate) => candidate.format === sourceFormat);
  if (!descriptor)
    throw new ConversionRouteError(
      "unsupported-route",
      `Unsupported source format: ${sourceFormat}`,
    );
  return descriptor;
}

function defaultDocumentName(
  sourceFormat: ConvertOptions["sourceFormat"],
): string {
  if (sourceFormat === "json") {
    return "JsonDocument";
  }

  if (sourceFormat === "json-schema") {
    return "JsonSchemaDocument";
  }

  if (sourceFormat === "typescript") {
    return "TypeScriptDocument";
  }

  return `${sourceFormat.replace(/[^a-zA-Z0-9]+/g, "_")}Document`;
}
