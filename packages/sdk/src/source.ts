import type {
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import type { IrKind } from "@schema-transformation-toolkit/core";
import { executeParser } from "@schema-transformation-toolkit/core";
import { resolveParserDescriptor } from "./registry.js";
import { defaultConversionRegistry } from "./registry.js";
import type {
  ConvertFailureResult,
  ConvertOptions,
  ConversionSourceFormat,
  ConversionTargetFormat,
  ConversionRegistry,
} from "./types.js";

export interface ParseSourceSuccessResult {
  ok: true;
  value?: ValueDocument;
  shape?: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics: SchemaDiagnostic[];
  semanticNotes: SchemaSemanticNote[];
}

export type ParseSourceResult = ParseSourceSuccessResult | ConvertFailureResult;

export function parseSource(
  input: string,
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  name: string,
  options: ConvertOptions,
  registry: ConversionRegistry = defaultConversionRegistry,
  requestedIr?: readonly IrKind[],
): ParseSourceResult {
  const descriptor = resolveParserDescriptor(sourceFormat, registry);
  const parserRequestedIr = requestedIr?.includes("shape")
    ? "shape"
    : requestedIr?.length === 1
      ? requestedIr[0]
      : undefined;
  const parseResult = executeParser(descriptor, input, {
    name,
    ...(parserRequestedIr ? { requestedIr: parserRequestedIr } : {}),
    options: parserOptionsFor(sourceFormat, options),
  });

  if (!parseResult.ok) {
    const code =
      parseResult.code === "invalid-ir-document" ||
      parseResult.code === "invalid-shape-document"
        ? "parser-invalid-shape"
        : parseResult.code;
    return {
      ok: false,
      code,
      message: parseResult.message,
      phase: "parse",
      plan: {
        sourceFormat,
        targetFormat,
        irSequence: [],
        stages: [],
      },
      ...(parseResult.diagnostics
        ? { diagnostics: parseResult.diagnostics }
        : {}),
    };
  }

  if (
    (parseResult.document.kind === "document" ||
      parseResult.artifacts?.shape) &&
    !descriptor.capabilities.producesIr.includes("shape")
  ) {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-capability-mismatch",
      "The source parser produced Shape IR without declaring it.",
    );
  }
  if (
    (parseResult.document.kind === "value-document" ||
      parseResult.artifacts?.value) &&
    !descriptor.capabilities.producesIr.includes("value")
  ) {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-capability-mismatch",
      "The source parser produced Value IR without declaring it.",
    );
  }
  if (
    parseResult.artifacts?.constraints &&
    !descriptor.capabilities.producesIr.includes("constraint")
  ) {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-capability-mismatch",
      "The source parser produced Constraint IR without declaring it.",
    );
  }

  if (parseResult.document.kind === "constraint-document") {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-produced-no-ir",
      "The source parser produced Constraint IR without a Value or Shape entry IR.",
    );
  }
  if (
    parseResult.document.kind !== "document" &&
    parseResult.document.kind !== "value-document"
  ) {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-invalid-shape",
      "The source parser produced an invalid IR document.",
    );
  }

  if (
    requestedIr?.includes("shape") &&
    parseResult.document.kind !== "document" &&
    !parseResult.artifacts?.shape
  ) {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-missing-shape",
      "The source parser produced Value IR but the target requires Shape IR.",
    );
  }

  return {
    ok: true,
    diagnostics: parseResult.diagnostics ?? [],
    semanticNotes: parseResult.semanticNotes ?? [],
    ...(parseResult.document.kind === "document"
      ? { shape: parseResult.document }
      : parseResult.artifacts?.shape
        ? { shape: parseResult.artifacts.shape }
        : { value: parseResult.document }),
    ...(parseResult.artifacts?.value
      ? { value: parseResult.artifacts.value }
      : {}),
    ...(parseResult.artifacts?.constraints
      ? { constraints: parseResult.artifacts.constraints }
      : {}),
  };
}

function createParserFailure(
  sourceFormat: string,
  targetFormat: string,
  code: string,
  message: string,
): ConvertFailureResult {
  return {
    ok: false,
    code,
    message,
    phase: "parse",
    plan: {
      sourceFormat,
      targetFormat,
      irSequence: [],
      stages: [],
    },
    diagnostics: [
      {
        severity: "error",
        code,
        message,
        source: `parser-${sourceFormat}`,
      },
    ],
  };
}

function parserOptionsFor(
  sourceFormat: ConversionSourceFormat,
  options: ConvertOptions,
): unknown {
  if (sourceFormat === "json") return options.advanced?.parser?.json ?? {};
  if (sourceFormat === "json-schema") {
    return options.advanced?.parser?.jsonSchema ?? {};
  }
  if (sourceFormat === "typescript") {
    return options.advanced?.parser?.typeScript ?? {};
  }
  if (sourceFormat === "openapi") {
    return options.advanced?.parser?.openapi ?? {};
  }
  if (sourceFormat === "zod") {
    return options.advanced?.parser?.zod ?? {};
  }
  if (sourceFormat === "yaml") {
    return options.advanced?.parser?.yaml ?? {};
  }
  if (sourceFormat === "csv") {
    return options.advanced?.parser?.csv ?? {};
  }
  if (sourceFormat === "toml") {
    return options.advanced?.parser?.toml ?? {};
  }
  return options.extension?.parser ?? {};
}
