import type {
  ConversionCapabilityRequirement,
  ConversionLossHotspot,
  ConstraintDocument,
  IrDocument,
  TransformResult,
  SemanticLoss,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import { executeIrTransformer } from "@schema-transformation-toolkit/core";
import type { JsonSchemaOutput } from "@schema-transformation-toolkit/generator-json-schema";
import type { OpenApiOutput } from "@schema-transformation-toolkit/generator-openapi";
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
  resolveConversionRouteDecision,
  resolveTransformerDescriptor,
  ConversionRouteError,
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
      error.code === "unsupported-ir-preference"
    ) {
      return {
        ok: false,
        code: "unsupported-ir-preference",
        message: `The requested IR preference "${options.irPreference}" is not available for ${options.sourceFormat} -> ${options.targetFormat}.`,
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
  const diagnostics: SchemaDiagnostic[] = [];
  const parseDiagnostics: SchemaDiagnostic[] = [];
  const generateDiagnostics: SchemaDiagnostic[] = [];
  const losses: SemanticLoss[] = [];
  const semanticNotes: SchemaSemanticNote[] = [];
  const parseSemanticNotes: SchemaSemanticNote[] = [];
  const transformDiagnostics: SchemaDiagnostic[] = [];
  const transformSemanticNotes: SchemaSemanticNote[] = [];
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
    routeDecision.parserRequestedIr,
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

  let pipelineDocument: IrDocument | undefined = shapeArtifact ?? valueArtifact;
  for (const transformerId of routeDecision.transformerIds) {
    if (!pipelineDocument) break;
    const transformer = resolveTransformerDescriptor(transformerId, registry);
    const currentDocument: IrDocument = pipelineDocument;
    const currentKind: string = (currentDocument as unknown as { kind: string })
      .kind;
    const transformed: TransformResult = executeIrTransformer(
      transformer,
      {
        document: currentDocument,
        artifacts: {
          ...(valueArtifact && currentDocument !== valueArtifact
            ? { value: valueArtifact }
            : {}),
          ...(shapeArtifact && currentDocument !== shapeArtifact
            ? { shape: shapeArtifact }
            : {}),
          ...(constraintsArtifact && currentKind !== "constraint-document"
            ? { constraints: constraintsArtifact }
            : {}),
        },
      },
      {},
    );
    if (!transformed.ok) {
      const transformationDiagnostics = combineDiagnostics(
        diagnostics,
        transformed.diagnostics,
      );
      return {
        ok: false,
        code: transformed.code,
        message: transformed.message,
        phase: "transform",
        plan,
        ...(transformationDiagnostics
          ? { diagnostics: transformationDiagnostics }
          : {}),
      };
    }
    const nextDocument: IrDocument = transformed.document;
    if (transformed.diagnostics) {
      diagnostics.push(...transformed.diagnostics);
      transformDiagnostics.push(...transformed.diagnostics);
    }
    if (transformed.semanticNotes) {
      semanticNotes.push(...transformed.semanticNotes);
      transformSemanticNotes.push(...transformed.semanticNotes);
    }
    pipelineDocument = nextDocument;
    if (nextDocument.kind === "value-document") valueArtifact = nextDocument;
    if (nextDocument.kind === "document") shapeArtifact = nextDocument;
    if (nextDocument.kind === "constraint-document") {
      constraintsArtifact = nextDocument;
    }
    if (transformed.artifacts?.value)
      valueArtifact = transformed.artifacts.value;
    if (transformed.artifacts?.shape)
      shapeArtifact = transformed.artifacts.shape;
    if (transformed.artifacts?.constraints) {
      constraintsArtifact = transformed.artifacts.constraints;
    }
  }

  if (!shapeArtifact && !valueArtifact) {
    return {
      ok: false,
      code: "parser-produced-no-ir",
      message: "The source parser produced neither Value IR nor Shape IR.",
      phase: "parse",
      plan,
      diagnostics: [
        {
          severity: "error",
          code: "parser-produced-no-ir",
          message: "The source parser produced neither Value IR nor Shape IR.",
          source: `parser-${options.sourceFormat}`,
        },
      ],
    };
  }

  const targetDescriptor = resolveGeneratorDescriptor(
    options.targetFormat,
    registry,
  );
  const generationInput =
    routeDecision.generatorInputIr === "shape" ? shapeArtifact : valueArtifact;

  if (!generationInput) {
    return {
      ok: false,
      code: "missing-generator-input",
      message:
        "The target generator requires an IR artifact the parser did not produce.",
      phase: "generate",
      plan,
      diagnostics: [
        {
          severity: "error",
          code: "missing-generator-input",
          message:
            "The target generator requires an IR artifact the parser did not produce.",
          source: `generator-${options.targetFormat}`,
        },
      ],
    };
  }

  const generationResult = generateTarget<TOutput>(
    generationInput,
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
    const generatorDescriptor = targetDescriptor;
    if (shapeArtifact) {
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
