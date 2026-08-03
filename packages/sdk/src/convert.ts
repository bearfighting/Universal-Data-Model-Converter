import type {
  ConversionCapabilityRequirement,
  ConversionLossHotspot,
  ConstraintDocument,
  SemanticLoss,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  ValueDocument,
} from "@aio/core";
import type { JsonSchemaOutput } from "@aio/generator-json-schema";
import { generateTarget } from "./generate.js";
import { planSemanticLosses } from "./losses.js";
import {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
  defaultConversionRegistry,
  resolveGeneratorDescriptor,
} from "./registry.js";
import type { ConversionRegistry } from "./types.js";
import {
  buildConversionReport,
  collectPreservedCapabilities,
  combineDiagnostics,
} from "./report.js";
import { parseSource } from "./source.js";
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
  planConversion: typeof planConversion;
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
    planConversion: (sourceFormat, targetFormat) =>
      planConversion(sourceFormat, targetFormat, registry),
    describeConversionRouteCapabilities: (sourceFormat, targetFormat) =>
      describeConversionRouteCapabilities(sourceFormat, targetFormat, registry),
  };
}

export function convert<TOutput = string | JsonSchemaOutput>(
  options: ConvertOptions,
  registry: ConversionRegistry = defaultConversionRegistry,
): ConvertResult<TOutput> {
  const plan = planConversion(
    options.sourceFormat,
    options.targetFormat,
    registry,
  );
  const name = options.name ?? defaultDocumentName(options.sourceFormat);
  const diagnostics: SchemaDiagnostic[] = [];
  const parseDiagnostics: SchemaDiagnostic[] = [];
  const generateDiagnostics: SchemaDiagnostic[] = [];
  const losses: SemanticLoss[] = [];
  const semanticNotes: SchemaSemanticNote[] = [];
  const parseSemanticNotes: SchemaSemanticNote[] = [];
  const generateSemanticNotes: SchemaSemanticNote[] = [];
  const capabilityRequirements: ConversionCapabilityRequirement[] = [];
  const lossHotspots: ConversionLossHotspot[] = [];
  let valueArtifact: ValueDocument | undefined;
  let shapeArtifact: SchemaDocument | undefined;
  let constraintsArtifact: ConstraintDocument | undefined;

  const parseResult = parseSource(
    options.input,
    options.sourceFormat,
    options.targetFormat,
    name,
    options,
    registry,
  );

  if (!parseResult.ok) {
    return {
      ...parseResult,
      plan,
    };
  }

  valueArtifact = parseResult.value;
  shapeArtifact = parseResult.shape;
  constraintsArtifact = parseResult.constraints;
  diagnostics.push(...parseResult.diagnostics);
  parseDiagnostics.push(...parseResult.diagnostics);
  semanticNotes.push(...parseResult.semanticNotes);
  parseSemanticNotes.push(...parseResult.semanticNotes);

  const generationResult = generateTarget<TOutput>(
    shapeArtifact,
    options.targetFormat,
    options,
    constraintsArtifact,
    registry,
  );

  if (!generationResult.ok) {
    const failureDiagnostics = combineDiagnostics(
      diagnostics,
      generationResult.diagnostics,
    );

    return {
      ok: false,
      code: generationResult.code,
      message: generationResult.message,
      phase: "generate",
      plan,
      ...(failureDiagnostics ? { diagnostics: failureDiagnostics } : {}),
    };
  }

  if (generationResult.diagnostics) {
    diagnostics.push(...generationResult.diagnostics);
    generateDiagnostics.push(...generationResult.diagnostics);
  }
  if (generationResult.semanticNotes) {
    semanticNotes.push(...generationResult.semanticNotes);
    generateSemanticNotes.push(...generationResult.semanticNotes);
  }

  const routeCapabilities = describeConversionRouteCapabilities(
    options.sourceFormat,
    options.targetFormat,
    registry,
  );

  try {
    const generatorDescriptor = resolveGeneratorDescriptor(
      options.targetFormat,
      registry,
    );
    const analysisContext = {
      sourceFormat: options.sourceFormat,
      targetFormat: options.targetFormat,
      routeCapabilities,
      document: shapeArtifact,
      ...(constraintsArtifact ? { constraints: constraintsArtifact } : {}),
    };

    losses.push(
      ...(generatorDescriptor.analysis?.planSemanticLosses
        ? generatorDescriptor.analysis.planSemanticLosses(analysisContext)
        : planSemanticLosses(
            routeCapabilities,
            constraintsArtifact,
            options.targetFormat,
            options.sourceFormat,
          )),
    );

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
  } catch {
    return {
      ok: false,
      code: "generator-analysis-failed",
      message: "The target generator analysis failed.",
      phase: "generate",
      plan,
      diagnostics: [
        {
          severity: "error",
          code: "generator-analysis-failed",
          message: "The target generator analysis failed.",
          source: `generator-${options.targetFormat}`,
        },
      ],
    };
  }

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
  );

  return {
    ok: true,
    output: generationResult.output,
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
