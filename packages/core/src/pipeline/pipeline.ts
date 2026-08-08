import type {
  IrArtifacts,
  IrBundle,
  IrDocument,
  IrKind,
  PipelineExecutionDiagnostics,
  PipelineExecutionFailure,
  PipelineExecutionRequest,
  PipelineExecutionResult,
  PipelineExecutionSemanticNotes,
} from "./contracts.js";
import { executeGenerator, executeParser } from "./execution.js";
import { executeIrTransformer } from "./validation.js";
import type { SchemaDiagnostic, SchemaSemanticNote } from "../schema/types.js";

export function executePipeline<TOutput>(
  request: PipelineExecutionRequest<TOutput>,
): PipelineExecutionResult<TOutput> {
  const diagnostics: PipelineExecutionDiagnostics = { all: [] };
  const semanticNotes: PipelineExecutionSemanticNotes = { all: [] };

  const planError = validatePipelinePlan(request);
  if (planError) {
    const phase = planError.phase;
    const diagnostic = pipelineDiagnostic(
      planError.code,
      planError.message,
      phase,
    );
    addStageDiagnostics(diagnostics, phase, [diagnostic]);
    return failure(request, phase, planError.code, planError.message, {
      ...stageExtras(diagnostics, semanticNotes),
    });
  }

  const parseResult = executeParser(request.parser, request.input, {
    ...request.parserContext,
  });
  if (!parseResult.ok) {
    addStageDiagnostics(diagnostics, "parse", parseResult.diagnostics);
    return failure(request, "parse", parseResult.code, parseResult.message, {
      ...stageExtras(diagnostics, semanticNotes),
    });
  }

  if (
    parseResult.document.kind === "constraint-document" &&
    !parseResult.artifacts?.value &&
    !parseResult.artifacts?.shape
  ) {
    const message =
      "The source parser produced Constraint IR without a Value or Shape entry IR.";
    addStageDiagnostics(diagnostics, "parse", [
      pipelineDiagnostic("parser-produced-no-ir", message, "parse"),
    ]);
    return failure(request, "parse", "parser-produced-no-ir", message, {
      ...stageExtras(diagnostics, semanticNotes),
    });
  }

  let bundle: IrBundle = {
    document: parseResult.document,
    artifacts: withPrimaryArtifact(parseResult.document, parseResult.artifacts),
  };
  addStageDiagnostics(diagnostics, "parse", parseResult.diagnostics);
  addStageSemanticNotes(semanticNotes, "parse", parseResult.semanticNotes);

  const firstStage = request.plan.stages[0];
  if (firstStage && documentKind(bundle.document) !== firstStage.from) {
    const message = `Pipeline expects ${firstStage.from} IR as the first transformer input, but the parser produced ${documentKind(bundle.document)} IR.`;
    addStageDiagnostics(diagnostics, "transform", [
      pipelineDiagnostic("pipeline-plan-mismatch", message, "transform"),
    ]);
    return failure(request, "transform", "pipeline-plan-mismatch", message, {
      bundle,
      ...stageExtras(diagnostics, semanticNotes),
    });
  }

  if (
    request.plan.stages.length === 0 &&
    documentKind(bundle.document) !== request.plan.selectedIr
  ) {
    const message = `Pipeline selected ${request.plan.selectedIr} IR but the parser produced ${documentKind(bundle.document)} IR.`;
    addStageDiagnostics(diagnostics, "generate", [
      pipelineDiagnostic("pipeline-plan-mismatch", message, "generate"),
    ]);
    return failure(request, "generate", "pipeline-plan-mismatch", message, {
      bundle,
      ...stageExtras(diagnostics, semanticNotes),
    });
  }

  const transformerById = new Map(
    (request.transformers ?? []).map((transformer) => [
      transformer.id,
      transformer,
    ]),
  );
  for (const stage of request.plan.stages) {
    const transformer = transformerById.get(stage.transformerId);
    if (!transformer) {
      const message = `Transformer "${stage.transformerId}" is not available for the planned pipeline.`;
      addStageDiagnostics(diagnostics, "transform", [
        pipelineDiagnostic("transformer-not-found", message, "transform"),
      ]);
      return failure(
        request,
        "transform",
        "transformer-not-found",
        `Transformer "${stage.transformerId}" is not available for the planned pipeline.`,
        {
          bundle,
          ...stageExtras(diagnostics, semanticNotes),
        },
      );
    }

    const result = executeIrTransformer(
      transformer,
      withoutPrimaryArtifact(bundle),
      request.transformerContext ?? {},
    );
    if (!result.ok) {
      addStageDiagnostics(diagnostics, "transform", result.diagnostics);
      return failure(request, "transform", result.code, result.message, {
        bundle,
        ...stageExtras(diagnostics, semanticNotes),
      });
    }

    bundle = {
      document: result.document,
      artifacts: withPrimaryArtifact(result.document, result.artifacts),
    };
    addStageDiagnostics(diagnostics, "transform", result.diagnostics);
    addStageSemanticNotes(semanticNotes, "transform", result.semanticNotes);
  }

  if (documentKind(bundle.document) !== request.plan.selectedIr) {
    const message = `Pipeline selected ${request.plan.selectedIr} IR but the pipeline produced ${documentKind(bundle.document)} IR.`;
    addStageDiagnostics(diagnostics, "generate", [
      pipelineDiagnostic("pipeline-plan-mismatch", message, "generate"),
    ]);
    return failure(request, "generate", "pipeline-plan-mismatch", message, {
      bundle,
      ...stageExtras(diagnostics, semanticNotes),
    });
  }

  if (!hasRequiredArtifacts(bundle, request.plan.requiredArtifacts)) {
    const message =
      "The target generator requires an IR artifact the pipeline did not produce.";
    addStageDiagnostics(diagnostics, "generate", [
      pipelineDiagnostic("missing-generator-artifact", message, "generate"),
    ]);
    return failure(request, "generate", "missing-generator-artifact", message, {
      bundle,
      ...stageExtras(diagnostics, semanticNotes),
    });
  }

  const generatorResult = executeGenerator(
    request.generator,
    withoutPrimaryArtifact(bundle),
    request.generatorContext ?? {},
  );
  if (!generatorResult.ok) {
    addStageDiagnostics(diagnostics, "generate", generatorResult.diagnostics);
    return failure(
      request,
      "generate",
      generatorResult.code,
      generatorResult.message,
      {
        bundle,
        ...stageExtras(diagnostics, semanticNotes),
      },
    );
  }

  addStageDiagnostics(diagnostics, "generate", generatorResult.diagnostics);
  addStageSemanticNotes(
    semanticNotes,
    "generate",
    generatorResult.semanticNotes,
  );

  let losses;
  if (
    bundle.document.kind === "document" &&
    (request.generator.analysis?.planSemanticLosses || request.lossPlanner) &&
    !request.routeCapabilities
  ) {
    const message =
      "Pipeline semantic-loss analysis requires route capabilities.";
    addStageDiagnostics(diagnostics, "generate", [
      pipelineDiagnostic("missing-analysis-context", message, "generate"),
    ]);
    return failure(request, "generate", "missing-analysis-context", message, {
      bundle,
      ...stageExtras(diagnostics, semanticNotes),
    });
  }
  if (bundle.document.kind === "document" && request.routeCapabilities) {
    try {
      const context = {
        sourceFormat: request.sourceFormat,
        targetFormat: request.targetFormat,
        routeCapabilities: request.routeCapabilities,
        document: bundle.document,
        ...(bundle.artifacts?.constraints
          ? { constraints: bundle.artifacts.constraints }
          : {}),
      };
      losses = request.generator.analysis?.planSemanticLosses?.(context);
      if (!losses && request.lossPlanner) losses = request.lossPlanner(context);
    } catch {
      const message = "The target generator analysis failed.";
      addStageDiagnostics(diagnostics, "generate", [
        pipelineDiagnostic("generator-analysis-failed", message, "generate"),
      ]);
      return failure(
        request,
        "generate",
        "generator-analysis-failed",
        "The target generator analysis failed.",
        {
          bundle,
          ...stageExtras(diagnostics, semanticNotes),
        },
      );
    }
  }

  const result: PipelineExecutionResult<TOutput> = {
    ok: true,
    output: generatorResult.output,
    bundle,
  };
  if (optionalDiagnostics(diagnostics)) result.diagnostics = diagnostics;
  if (optionalSemanticNotes(semanticNotes))
    result.semanticNotes = semanticNotes;
  if (losses && losses.length > 0) result.losses = losses;
  return result;
}

function failure<TOutput>(
  request: PipelineExecutionRequest<TOutput>,
  phase: PipelineExecutionFailure["phase"],
  code: string,
  message: string,
  extras: Partial<PipelineExecutionFailure> = {},
): PipelineExecutionFailure {
  return { ok: false, code, message, phase, plan: request.plan, ...extras };
}

function addStageDiagnostics(
  target: PipelineExecutionDiagnostics,
  stage: "parse" | "transform" | "generate",
  entries: readonly SchemaDiagnostic[] | undefined,
): void {
  if (!entries || entries.length === 0) return;
  const current = target[stage] ?? [];
  target[stage] = [...current, ...entries];
  target.all.push(...entries);
}

function addStageSemanticNotes(
  target: PipelineExecutionSemanticNotes,
  stage: "parse" | "transform" | "generate",
  entries: readonly SchemaSemanticNote[] | undefined,
): void {
  if (!entries || entries.length === 0) return;
  const current = target[stage] ?? [];
  target[stage] = [...current, ...entries];
  target.all.push(...entries);
}

function stageExtras(
  diagnostics: PipelineExecutionDiagnostics,
  semanticNotes: PipelineExecutionSemanticNotes,
): Partial<PipelineExecutionFailure> {
  const result: Partial<PipelineExecutionFailure> = {};
  if (diagnostics.all.length > 0) result.diagnostics = diagnostics;
  if (semanticNotes.all.length > 0) result.semanticNotes = semanticNotes;
  return result;
}

function pipelineDiagnostic(
  code: string,
  message: string,
  phase: "parse" | "transform" | "generate",
): SchemaDiagnostic {
  return {
    severity: "error",
    code,
    message,
    source: `pipeline-${phase}`,
  };
}

function validatePipelinePlan<TOutput>(
  request: PipelineExecutionRequest<TOutput>,
):
  | { code: string; message: string; phase: "transform" | "generate" }
  | undefined {
  const transformers = new Map(
    (request.transformers ?? []).map((transformer) => [
      transformer.id,
      transformer,
    ]),
  );
  let previousOutput: IrKind | undefined;
  for (const stage of request.plan.stages) {
    const transformer = transformers.get(stage.transformerId);
    if (!transformer) {
      return {
        code: "transformer-not-found",
        message: `Transformer "${stage.transformerId}" is not available for the planned pipeline.`,
        phase: "transform",
      };
    }
    if (
      transformer.inputIr !== stage.from ||
      transformer.outputIr !== stage.to
    ) {
      return {
        code: "pipeline-plan-mismatch",
        message: `Pipeline stage "${stage.transformerId}" does not match its transformer contract.`,
        phase: "transform",
      };
    }
    if (previousOutput && previousOutput !== stage.from) {
      return {
        code: "pipeline-plan-mismatch",
        message: "Pipeline transformer stages are not type-compatible.",
        phase: "transform",
      };
    }
    previousOutput = stage.to;
  }

  if (previousOutput && previousOutput !== request.plan.selectedIr) {
    return {
      code: "pipeline-plan-mismatch",
      message: `Pipeline ends at ${previousOutput} IR but selects ${request.plan.selectedIr} IR.`,
      phase: "generate",
    };
  }

  const entries = request.generator.capabilities.entries;
  const selectedEntry = entries?.find(
    (entry) => entry.ir === request.plan.selectedIr,
  );
  const declaredEntryKinds: IrKind[] =
    entries?.map((entry) => entry.ir) ??
    request.generator.capabilities.entryIr ??
    request.generator.capabilities.consumesIr.filter(
      (kind): kind is Exclude<IrKind, "constraint"> =>
        kind === "value" || kind === "shape",
    );
  if (!declaredEntryKinds.includes(request.plan.selectedIr)) {
    return {
      code: "pipeline-plan-mismatch",
      message: `Generator does not accept the pipeline's selected ${request.plan.selectedIr} IR.`,
      phase: "generate",
    };
  }

  for (const artifact of request.plan.requiredArtifacts ?? []) {
    if (!isIrKind(artifact)) {
      return {
        code: "pipeline-plan-mismatch",
        message: `Pipeline requires an invalid IR artifact kind: ${String(artifact)}.`,
        phase: "generate",
      };
    }
    if (!selectedEntry || !selectedEntry.artifacts?.includes(artifact)) {
      return {
        code: "pipeline-plan-mismatch",
        message: `Generator does not declare required ${artifact} IR for its selected entry.`,
        phase: "generate",
      };
    }
  }
  return undefined;
}

function optionalDiagnostics(
  value: PipelineExecutionDiagnostics,
): PipelineExecutionDiagnostics | undefined {
  return value.all.length > 0 ? value : undefined;
}

function optionalSemanticNotes(
  value: PipelineExecutionSemanticNotes,
): PipelineExecutionSemanticNotes | undefined {
  return value.all.length > 0 ? value : undefined;
}

function hasRequiredArtifacts(
  bundle: IrBundle,
  required: IrKind[] | undefined,
): boolean {
  return (required ?? []).every((kind) => {
    if (kind === documentKind(bundle.document)) return true;
    if (kind === "value") return Boolean(bundle.artifacts?.value);
    if (kind === "shape") return Boolean(bundle.artifacts?.shape);
    return Boolean(bundle.artifacts?.constraints);
  });
}

function documentKind(document: IrDocument): IrKind {
  if (document.kind === "value-document") return "value";
  if (document.kind === "document") return "shape";
  return "constraint";
}

function isIrKind(value: unknown): value is IrKind {
  return value === "value" || value === "shape" || value === "constraint";
}

function withPrimaryArtifact(
  document: IrDocument,
  artifacts: IrArtifacts | undefined,
): IrArtifacts {
  const merged = { ...(artifacts ?? {}) };
  if (document.kind === "value-document") merged.value = document;
  if (document.kind === "document") merged.shape = document;
  if (document.kind === "constraint-document") merged.constraints = document;
  return merged;
}

function withoutPrimaryArtifact<TDocument extends IrDocument>(
  bundle: IrBundle<TDocument>,
): IrBundle<TDocument> {
  const artifacts = { ...(bundle.artifacts ?? {}) };
  if (bundle.document.kind === "value-document") delete artifacts.value;
  if (bundle.document.kind === "document") delete artifacts.shape;
  if (bundle.document.kind === "constraint-document") {
    delete artifacts.constraints;
  }
  return Object.keys(artifacts).length > 0
    ? { document: bundle.document, artifacts }
    : { document: bundle.document };
}
