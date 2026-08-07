import type {
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
  ValueDocument,
} from "@schema-transformation-toolkit/core";
import type { IrKind } from "@schema-transformation-toolkit/core";
import { validateSchemaDocument } from "@schema-transformation-toolkit/core";
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
  let parseResult;
  try {
    parseResult = descriptor.parse(input, {
      name,
      targetFormat,
      ...(requestedIr ? { requestedIr } : {}),
      options: parserOptionsFor(sourceFormat, options),
    });
  } catch {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-descriptor-failed",
      "The source parser failed while producing its result.",
    );
  }

  if (!parseResult.ok) {
    return {
      ok: false,
      code: parseResult.code,
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

  if (parseResult.document) {
    try {
      validateSchemaDocument(parseResult.document);
    } catch {
      return createParserFailure(
        sourceFormat,
        targetFormat,
        "parser-invalid-shape",
        "The source parser produced an invalid Shape IR document.",
      );
    }
  }

  if (
    parseResult.document &&
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
    parseResult.value &&
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
    parseResult.constraints &&
    !descriptor.capabilities.producesIr.includes("constraint")
  ) {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-capability-mismatch",
      "The source parser produced Constraint IR without declaring it.",
    );
  }

  if (!parseResult.document && !parseResult.value) {
    return createParserFailure(
      sourceFormat,
      targetFormat,
      "parser-produced-no-ir",
      "The source parser produced neither Value IR nor Shape IR.",
    );
  }

  if (requestedIr?.includes("shape") && !parseResult.document) {
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
    ...(parseResult.document ? { shape: parseResult.document } : {}),
    ...(parseResult.value ? { value: parseResult.value } : {}),
    ...(parseResult.constraints
      ? { constraints: parseResult.constraints }
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
  return options.extension?.parser ?? {};
}
