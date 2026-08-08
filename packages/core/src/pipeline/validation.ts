import type { SchemaDiagnostic } from "../schema/types.js";
import { tryValidateSchemaDocument } from "../schema/validation.js";
import type { IrArtifacts, IrBundle, IrDocument, IrKind } from "./contracts.js";
import type {
  IrTransformerDescriptor,
  TransformResult,
  TransformerExecutionContext,
} from "./descriptor-contracts.js";
import { tryValidateValueDocument } from "../value/internal.js";

export interface IrValidationSuccess {
  ok: true;
}

export interface IrValidationFailure {
  ok: false;
  diagnostics: SchemaDiagnostic[];
}

export type IrValidationResult = IrValidationSuccess | IrValidationFailure;

export function executeIrTransformer<
  TInput extends IrDocument,
  TOutput extends IrDocument,
  TOptions,
>(
  descriptor: IrTransformerDescriptor<TInput, TOutput, TOptions>,
  input: IrBundle<TInput>,
  context: TransformerExecutionContext<TOptions>,
): TransformResult<TOutput> {
  if (
    typeof descriptor !== "object" ||
    descriptor === null ||
    descriptor.kind !== "transformer" ||
    typeof descriptor.id !== "string" ||
    descriptor.id.trim().length === 0 ||
    descriptor.descriptorVersion !== "0.1" ||
    !isIrKind(descriptor.inputIr) ||
    !isIrKind(descriptor.outputIr)
  ) {
    return transformerFailure(
      "invalid-transformer-descriptor",
      "The transformer descriptor is invalid.",
    );
  }
  const inputValidation = tryValidateIrBundle(input);
  if (!inputValidation.ok) {
    return transformerFailure(
      "invalid-transformer-input",
      inputValidation.diagnostics[0]?.message ??
        "Transformer input is invalid.",
    );
  }
  if (!matchesIrKind(input.document, descriptor.inputIr)) {
    return transformerFailure(
      "transformer-input-mismatch",
      `Transformer "${descriptor.id}" requires ${descriptor.inputIr} IR.`,
    );
  }

  let result: TransformResult<TOutput>;
  try {
    result = descriptor.transform(input, context);
  } catch {
    return transformerFailure(
      "transformer-failed",
      `Transformer "${descriptor.id}" failed while producing its result.`,
    );
  }
  if (!result.ok) return withTransformerDiagnostic(result, descriptor.id);

  const outputValidation = tryValidateIrBundle({
    document: result.document,
    ...(result.artifacts ? { artifacts: result.artifacts } : {}),
  });
  if (!outputValidation.ok) {
    return transformerFailure(
      "invalid-transformer-output",
      outputValidation.diagnostics[0]?.message ??
        "Transformer output is invalid.",
    );
  }
  if (!matchesIrKind(result.document, descriptor.outputIr)) {
    return transformerFailure(
      "transformer-output-mismatch",
      `Transformer "${descriptor.id}" must produce ${descriptor.outputIr} IR.`,
    );
  }
  const inputKind = documentIrKind(input.document);
  const outputKind = documentIrKind(result.document);
  const mergedArtifacts: IrArtifacts = {
    ...(input.artifacts ?? {}),
    ...(result.artifacts ?? {}),
    ...artifactForKind(inputKind, input.document),
  };
  deleteArtifactForKind(mergedArtifacts, outputKind);
  return {
    ...result,
    ...(Object.keys(mergedArtifacts).length
      ? { artifacts: mergedArtifacts }
      : {}),
  };
}

function documentIrKind(document: IrDocument): IrKind {
  if (document.kind === "value-document") return "value";
  if (document.kind === "document") return "shape";
  return "constraint";
}

function artifactForKind(kind: IrKind, document: IrDocument): IrArtifacts {
  if (kind === "value") return { value: document as never };
  if (kind === "shape") return { shape: document as never };
  return { constraints: document as never };
}

function deleteArtifactForKind(artifacts: IrArtifacts, kind: IrKind): void {
  if (kind === "value") delete artifacts.value;
  if (kind === "shape") delete artifacts.shape;
  if (kind === "constraint") delete artifacts.constraints;
}

export function tryValidateIrBundle(input: unknown): IrValidationResult {
  if (!isRecord(input) || !("document" in input)) {
    return failure("invalid-ir-bundle", "IR input must contain a document.");
  }

  const document = input.document;
  const documentResult = tryValidateIrDocument(document);
  if (!documentResult.ok) return documentResult;

  const artifacts = "artifacts" in input ? input.artifacts : undefined;
  if (artifacts !== undefined) {
    if (!isRecord(artifacts)) {
      return failure(
        "invalid-ir-artifacts",
        "IR artifacts must be an object when provided.",
      );
    }
    const artifactResult = tryValidateArtifacts(
      artifacts as IrArtifacts,
      document as IrDocument,
    );
    if (!artifactResult.ok) return artifactResult;
  }

  return { ok: true };
}

export function tryValidateIrDocument(input: unknown): IrValidationResult {
  if (!isRecord(input) || typeof input.kind !== "string") {
    return failure("invalid-ir-document", "IR document kind is required.");
  }

  if (input.kind === "value-document") {
    return toIrResult(tryValidateValueDocument(input as never));
  }

  if (input.kind === "document") {
    try {
      return toIrResult(tryValidateSchemaDocument(input as never));
    } catch {
      return failure("invalid-shape-document", "Shape IR is malformed.");
    }
  }

  if (input.kind === "constraint-document") {
    return validateConstraintDocument(input);
  }

  return failure(
    "invalid-ir-kind",
    `Unsupported IR document kind: ${input.kind}.`,
  );
}

function tryValidateArtifacts(
  artifacts: IrArtifacts,
  document: IrDocument,
): IrValidationResult {
  if (artifacts.value !== undefined) {
    if (document.kind === "value-document") {
      return failure(
        "duplicate-ir-document",
        "The primary IR document must not be repeated in artifacts.value.",
      );
    }
    const result = tryValidateIrDocument(artifacts.value);
    if (!result.ok) return result;
    if (artifacts.value.kind !== "value-document") {
      return failure(
        "invalid-ir-artifacts",
        "artifacts.value must be Value IR.",
      );
    }
  }
  if (artifacts.shape !== undefined) {
    if (document.kind === "document") {
      return failure(
        "duplicate-ir-document",
        "The primary IR document must not be repeated in artifacts.shape.",
      );
    }
    const result = tryValidateIrDocument(artifacts.shape);
    if (!result.ok) return result;
    if (artifacts.shape.kind !== "document") {
      return failure(
        "invalid-ir-artifacts",
        "artifacts.shape must be Shape IR.",
      );
    }
  }
  if (artifacts.constraints !== undefined) {
    if (document.kind === "constraint-document") {
      return failure(
        "duplicate-ir-document",
        "The primary IR document must not be repeated in artifacts.constraints.",
      );
    }
    const result = tryValidateIrDocument(artifacts.constraints);
    if (!result.ok) return result;
    if (artifacts.constraints.kind !== "constraint-document") {
      return failure(
        "invalid-ir-artifacts",
        "artifacts.constraints must be Constraint IR.",
      );
    }
  }
  return { ok: true };
}

function validateConstraintDocument(
  input: Record<string, unknown>,
): IrValidationResult {
  if (
    typeof input.name !== "string" ||
    input.name.trim().length === 0 ||
    !Array.isArray(input.entries)
  ) {
    return failure(
      "invalid-constraint-document",
      "Constraint IR requires a non-empty name and entries array.",
    );
  }
  for (const entry of input.entries) {
    if (!isRecord(entry) || !isRecord(entry.target)) {
      return failure(
        "invalid-constraint-entry",
        "Constraint IR entries require a target object.",
      );
    }
    if (
      typeof entry.target.kind !== "string" ||
      !Array.isArray(entry.target.path) ||
      !entry.target.path.every((segment) => typeof segment === "string") ||
      !Array.isArray(entry.constraints)
    ) {
      return failure(
        "invalid-constraint-entry",
        "Constraint IR entries require a valid target and constraints array.",
      );
    }
    for (const item of entry.constraints) {
      if (!isRecord(item) || typeof item.kind !== "string") {
        return failure(
          "invalid-constraint",
          "Constraint IR items require a string kind.",
        );
      }
    }
  }
  return { ok: true };
}

function toIrResult(
  result: { ok: true } | { ok: false; diagnostics: SchemaDiagnostic[] },
): IrValidationResult {
  return result.ok ? result : result;
}

function failure(code: string, message: string): IrValidationFailure {
  return {
    ok: false,
    diagnostics: [{ severity: "error", code, message, source: "core" }],
  };
}

function transformerFailure(code: string, message: string) {
  return {
    ok: false as const,
    code,
    message,
    diagnostics: [
      { severity: "error" as const, code, message, source: "core-transformer" },
    ],
  };
}

function withTransformerDiagnostic(
  result: Extract<TransformResult, { ok: false }>,
  transformerId: string,
): Extract<TransformResult, { ok: false }> {
  if (result.diagnostics && result.diagnostics.length > 0) return result;
  return {
    ...result,
    diagnostics: [
      {
        severity: "error",
        code: result.code,
        message: result.message,
        source: `transformer-${transformerId}`,
      },
    ],
  };
}

function matchesIrKind(document: IrDocument, kind: IrKind): boolean {
  return (
    (kind === "value" && document.kind === "value-document") ||
    (kind === "shape" && document.kind === "document") ||
    (kind === "constraint" && document.kind === "constraint-document")
  );
}

function isIrKind(value: unknown): value is IrKind {
  return value === "value" || value === "shape" || value === "constraint";
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
